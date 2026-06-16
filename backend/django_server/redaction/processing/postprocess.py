import re
from .preprocess import normalize
from ..utils.helpers import INDIAN_CITIES, build_entity_tree, overlaps_tree

STOP_WORDS = {
    "email",
    "phone",
    "account",
    "number",
    "card",
    "id",
    "contact",
    "mail"
}

ENTITY_PRIORITY = {
    "CREDIT_CARD": 7,
    "AADHAAR": 6,
    "PAN": 6,
    "IFSC_CODE": 6,
    "PHONE_NUMBER": 6,
    "EMAIL_ADDRESS": 5,
    "IP_ADDRESS": 5,
    "MAC_ADDRESS": 5,
    "URL": 5,
    "BANK_ACCOUNT": 4,
    "DOMAIN": 3,
    "PINCODE": 3,
    "CRYPTO": 3,
    "PERSON": 2,
    "LOCATION": 2,
    "ORG": 2,
    "DATE_TIME": 1,
}

NON_NAME_WORDS = {
    "unknown", "data", "senior", "junior", "new", "old", "former", "current",
    "direct", "personal", "corporate", "work", "office", "home", "invalid",
    "temporary", "suspended", "pending", "review", "unusual", "linked",
    "flagged", "accessed", "notified", "verified", "completed", "relocated",
    "scientist", "engineer", "manager", "developer", "analyst", "director",
    "assistant", "associate", "consultant", "specialist", "coordinator",
    "india", "indian", "mumbai", "delhi", "bangalore", "chennai", "pune",
    "true", "false", "none", "null", "undefined", "success", "failed",
    "error", "warning", "info", "debug", "test", "sample", "example",
}

def clean_person_entities(entities):
    res = []
    for e in entities:
        if e["type"] != "PERSON":
            res.append(e)
            continue

        if e["text"].lower().strip() in NON_NAME_WORDS:
            continue

        words = e["text"].split()
        if all(w.lower() in NON_NAME_WORDS for w in words):
            continue
        
        if len(words) == 1:
            w = words[0]
            if not w[0].isupper():
                continue
            if w.lower() in NON_NAME_WORDS:
                continue

        clean_words = []
        for w in words:
            if w.lower() in STOP_WORDS:
                break
            clean_words.append(w)

        if not clean_words:
            continue

        if clean_words[0].lower() in NON_NAME_WORDS:
            continue

        clean_text = " ".join(clean_words)
        new_end = e["start"] + len(clean_text)
        res.append({
            **e,
            "text": clean_text,
            "end": new_end,
        })

    return res


def split_location_pincode(entities):
    res = []
    for e in entities:
        if e["type"] == "LOCATION":
            matches = list(re.finditer(r"\d{5,6}", e["text"]))
            if matches:
                last_end = 0
                for m in matches:
                    loc_part = e["text"][last_end:m.start()].strip()
                    if loc_part:
                        res.append({
                            "text": loc_part,
                            "type": "LOCATION",
                            "start": e["start"] + last_end,
                            "end": e["start"] + last_end + len(loc_part)
                        })

                    res.append({
                        "text": m.group(),
                        "type": "PINCODE",
                        "start": e["start"] + m.start(),
                        "end": e["start"] + m.end()
                    })
                    last_end = m.end()
                tail = e["text"][last_end:].strip()
                if tail:
                    res.append({
                        "text": tail,
                        "type": "LOCATION",
                        "start": e["end"] - len(tail),
                        "end": e["end"]
                    })
                continue
        res.append(e)
    return res


def filter_entities(entities, text):
    res = []
    for e in entities:
        val = e["text"].lower().strip()

        if e["type"] == "DATE_TIME":
            if val.isdigit():
                continue
            if len(val) <= 4 and val.isdigit():
                continue
            digits_only = re.sub(r"[^0-9]", "", val)
            if len(e["text"].strip()) <= 4 and digits_only == val.strip():
                continue

        if e["type"] == "BANK_ACCOUNT":
            context = text[max(0, e["start"]-30):e["end"]+30].lower()
            if not any(word in context for word in ["bank", "account", "acc", "ifsc", "number"]):
                continue

        if e["type"] == "PINCODE":
            context = text[max(0, e["start"]-30):e["end"]+30].lower()
            has_keyword = any(word in context for word in ["pin", "pincode", "zip", "zipcode", "postal"])
            near_city = any(
                loc["type"] == "LOCATION" and
                normalize(loc["text"]) in INDIAN_CITIES and
                abs(loc["end"] - e["start"]) <= 50
                for loc in entities
            )
            if not (has_keyword or near_city):
                continue

        if e["type"] == "DOMAIN" and "@" in val:
            continue

        res.append(e)

    return res


def resolve_overlaps(entities):
    entities = sorted(
        entities,
        key=lambda x: (x["start"], -ENTITY_PRIORITY.get(x["type"], 0))
    )

    tree = build_entity_tree([])
    result = []

    for ent in entities:
        if not overlaps_tree(tree, ent["start"], ent["end"]):
            result.append(ent)
            if ent["start"] < ent["end"]:
                tree[ent["start"]:ent["end"]] = ent

    return sorted(result, key=lambda x: x["start"])


def fix_person_as_location(entities, text):
    corrected = []
    for e in entities:
        if e["type"] != "PERSON":
            corrected.append(e)
            continue

        clean = normalize(e["text"])
        if clean in INDIAN_CITIES:
            e = {**e, "type": "LOCATION", "confidence": 0.75}
            corrected.append(e)
            continue

        words = e["text"].split()
        if len(words) > 1 and e["text"].lower() in INDIAN_CITIES:
            e = {**e, "type": "LOCATION", "confidence": 0.75}
            corrected.append(e)
            continue

        corrected.append(e)

    return corrected