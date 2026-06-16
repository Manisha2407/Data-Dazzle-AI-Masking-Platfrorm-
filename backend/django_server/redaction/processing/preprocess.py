import re
from ..utils.helpers import INDIAN_NAMES, INDIAN_CITIES, overlaps_tree

def normalize(word):
    return re.sub(r"[^a-z]", "", word.lower())

def remove_misclassified_locations(entities, text):
    cleaned = []
    for e in entities:
        if e["type"] != "LOCATION":
            cleaned.append(e)
            continue
        words = e["text"].split()
        if any(normalize(w) in INDIAN_CITIES for w in words):
            cleaned.append(e)
            continue
        normalized_words = [normalize(w) for w in words if normalize(w)]
        if not normalized_words:
            cleaned.append(e)
            continue
        name_matches = [w for w in normalized_words if w in INDIAN_NAMES]
        if len(name_matches) == len(normalized_words) or len(name_matches) >= 2:
            continue
        cleaned.append(e)
    return cleaned

LOCATION_SUFFIXES = {
    "nagar", "pur", "puram", "ganj", "gunj", "wadi", "palli", "pet",
    "bad", "abad", "garh", "colony", "road", "street", "marg",
    "chowk", "bazar", "bazaar", "market", "park", "garden", "vihar",
    "enclave", "sector", "block", "phase", "layout", "extension",
    "hills", "valley", "heights", "residency", "township", "city",
}

def add_name_dataset_fallback(entities, text, tree):
    tokens = [(m.group(), m.start(), m.end()) for m in re.finditer(r"\b[a-zA-Z]+\b", text)]
    i = 0
    while i < len(tokens):
        word, start, end = tokens[i]
        clean = normalize(word)
        if len(clean) < 3 or clean not in INDIAN_NAMES:
            i += 1
            continue
        if clean in LOCATION_SUFFIXES:
            i += 1
            continue
        j = i + 1
        while j < len(tokens):
            next_word, next_start, next_end = tokens[j]
            next_clean = normalize(next_word)
            gap = text[end:next_start]
            if gap.strip() != "":
                break
            if next_clean in LOCATION_SUFFIXES:
                break
            if len(next_clean) < 2 or next_clean not in INDIAN_NAMES:
                break
            end = next_end
            j += 1

        final_text = text[start:end]
        final_words = final_text.split()
        while final_words and normalize(final_words[-1]) in LOCATION_SUFFIXES:
            final_words.pop()
        if not final_words:
            i = j
            continue
        final_text = " ".join(final_words)
        end = start + len(final_text)

        if not overlaps_tree(tree, start, end):
            new_entity = {
                "text": final_text,
                "type": "PERSON",
                "start": start,
                "end": end,
                "confidence": 0.75,
            }
            entities.append(new_entity)
            if start < end:
                tree[start:end] = new_entity

        i = j

    return entities

COMMON_LOCATIONS = {
    "india", "mumbai", "delhi", "bangalore", "bengaluru", "london",
    "paris", "tokyo", "dubai", "chennai", "kolkata", "hyderabad",
    "pune", "ahmedabad", "jaipur", "new", "york", "los", "angeles",
    "chicago", "berlin", "sydney", "singapore", "maharashtra", "gurugram",
    "gurgaon", "noida", "faridabad", "ghaziabad", "lucknow", "patna",
}

BANK_ORG_WORDS = {
    "bank", "national", "insurance", "finance", "capital", "securities",
    "technologies", "solutions", "services", "systems", "enterprises",
    "industries", "corporation", "cooperative", "federation", "trust",
}

def add_location_fallback(entities, text, tree):
    triggers = {"address", "from", "in", "at", "to", "near", "relocate", "relocated"}
    stop_words = {
        "my", "his", "her", "their", "our", "name", "email", "phone",
        "account", "number", "card", "contact",
    }

    words = text.split()
    cursor = 0
    positions = []
    for w in words:
        pos = text.find(w, cursor)
        positions.append((w, pos))
        cursor = pos + len(w)

    for i, (word, _) in enumerate(positions):
        lw = word.lower().strip(".,:")

        if lw not in triggers:
            continue

        j = i + 1
        while j < len(positions):
            candidate, start = positions[j]
            candidate_clean = candidate.strip(".,:")

            if not candidate_clean:
                j += 1
                continue

            if candidate_clean.lower() in stop_words:
                break

            if not candidate_clean[0].isupper():
                if candidate_clean.lower() not in INDIAN_CITIES:
                    break

            end = start + len(candidate_clean)

            if overlaps_tree(tree, start, end):
                break

            if normalize(candidate_clean) in INDIAN_NAMES and candidate_clean.lower() not in INDIAN_CITIES:
                break

            next_word_clean = positions[j + 1][0].strip(",.:").lower() if j + 1 < len(positions) else ""
            if next_word_clean in BANK_ORG_WORDS:
                break

            if j == i + 1:
                next_is_cap = bool(next_word_clean and next_word_clean[0].isupper())
                if not next_is_cap and (
                    candidate_clean.lower() not in COMMON_LOCATIONS and
                    candidate_clean.lower() not in INDIAN_CITIES
                ):
                    break

            exists = any(e["start"] == start and e["end"] == end for e in entities)
            if not exists:
                new_entity = {
                    "text": candidate_clean,
                    "type": "LOCATION",
                    "start": start,
                    "end": end,
                    "confidence": 0.6,
                }
                entities.append(new_entity)
                if start < end:
                    tree[start:end] = new_entity

            j += 1

    for match in re.finditer(r"\b[A-Z][a-z]+\b", text):
        word = match.group()
        if word.lower() not in INDIAN_CITIES and word.lower() not in COMMON_LOCATIONS:
            continue
        start, end = match.start(), match.end()
        if overlaps_tree(tree, start, end):
            continue
        new_entity = {
            "text": word,
            "type": "LOCATION",
            "start": start,
            "end": end,
            "confidence": 0.65,
        }
        entities.append(new_entity)
        if start < end:
            tree[start:end] = new_entity

    return entities