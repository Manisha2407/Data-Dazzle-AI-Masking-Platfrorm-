from multiprocessing import Pool
from intervaltree import IntervalTree
from .services.detection import detect_pii
from .services.anonymizer import anonymize_text
from .services.org_detector import (
    detect_org_entities,
    boost_org_detection,
    split_compound_orgs,
    filter_org_entities,
)
from .processing.preprocess import (
    add_location_fallback,
    add_name_dataset_fallback,
    remove_misclassified_locations
)
from .processing.postprocess import (
    split_location_pincode,
    clean_person_entities,
    filter_entities,
    resolve_overlaps,
    fix_person_as_location,
)
from .utils.helpers import calculate_entity_counts

CHUNK_SIZE = 120000


def chunk_text(text, chunk_size=CHUNK_SIZE):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            while end > start and text[end] not in ' \n':
                end -= 1
        chunks.append((text[start:end], start))
        start = end
    return chunks


def process_chunk(chunk, offset, method, confidence, entities):
    detected = detect_pii(
        text=chunk,
        entities=None if entities == "ALL" else entities,
        confidence=confidence,
    )
    for e in detected:
        e["start"] += offset
        e["end"] += offset
    return detected


def process_org_chunk(chunk, offset):
    orgs = detect_org_entities(chunk)
    for e in orgs:
        e["start"] += offset
        e["end"] += offset
    return orgs


def run_pipeline(detected, text, entities="ALL"):
    def should_include(entity_type):
        if entities is None or entities == "ALL":
            return True
        return entity_type in entities

    processed = split_location_pincode(detected)
    processed = clean_person_entities(processed)
    processed = remove_misclassified_locations(processed, text)

    tree = IntervalTree()
    for e in processed:
        if e["start"] < e["end"]:
            tree[e["start"]:e["end"]] = e

    if should_include("PERSON"):
        processed = add_name_dataset_fallback(processed, text, tree)
        processed = fix_person_as_location(processed, text)

    if should_include("ORG"):
        if len(text) > CHUNK_SIZE:
            chunks = chunk_text(text)
            with Pool(4) as p:
                results = p.starmap(process_org_chunk, chunks)
            all_spacy_orgs = [item for sublist in results for item in sublist]
        else:
            all_spacy_orgs = detect_org_entities(text)

        spacy_orgs = split_compound_orgs(all_spacy_orgs)
        boost_orgs = boost_org_detection(text, spacy_orgs + processed)
        all_orgs = filter_org_entities(spacy_orgs + boost_orgs, text)

        for e in all_orgs:
            if e["start"] < e["end"] and not tree[e["start"]:e["end"]]:
                processed.append(e)
                tree[e["start"]:e["end"]] = e

    if should_include("LOCATION"):
        processed = add_location_fallback(processed, text, tree)

    processed = resolve_overlaps(processed)

    if should_include("PERSON"):
        processed = fix_person_as_location(processed, text)

    processed = filter_entities(processed, text)

    return processed


def process_text(text, method="mask", confidence=70, entities="ALL"):
    if entities is None:
        entities = "ALL"
    if len(text) > CHUNK_SIZE:
        chunks = chunk_text(text)
        args = [(chunk, offset, method, confidence, entities) for chunk, offset in chunks]
        with Pool(4) as p:
            results = p.starmap(process_chunk, args)
        all_detected = [item for sublist in results for item in sublist]
        processed = run_pipeline(all_detected, text, entities)
    else:
        detected = detect_pii(
            text=text,
            entities=None if entities == "ALL" else entities,
            confidence=confidence,
        )
        processed = run_pipeline(detected, text, entities)

    redacted_text = anonymize_text(text, processed, method)
    entity_counts = calculate_entity_counts(processed)

    return {
        "redacted_text": redacted_text,
        "entities": processed,
        "entity_counts": entity_counts,
        "total_entities": len(processed),
    }