from .analyzer import get_spacy_model
from ..utils.helpers import INDIAN_NAMES, INDIAN_CITIES, build_entity_tree, overlaps_tree
import re

ORG_HINT_WORDS = {"company", "inc", "ltd", "corp", "ceo", "startup", "organization", "co"}
ORG_HINT_PHRASES = {"works at", "joined", "hired", "employee"}
ORG_WHITELIST = {
    "microsoft", "google", "apple", "amazon", "meta", "netflix", "uber",
    "twitter", "linkedin", "facebook", "adobe", "oracle", "samsung",
    "infosys", "wipro", "tcs", "accenture", "ibm", "intel", "nvidia",
    "flipkart", "swiggy", "zomato", "paytm", "razorpay", "freshworks",
}

STOP_WORDS = {
    "is", "a", "the", "an", "and", "or", "in", "at", "of", "for", "vs", "versus", "from",
    "joined", "works", "hired", "employee", "by", "with", "was", "has",
    "he", "she", "they", "we", "it", "his", "her", "their", "our",
    "my", "your", "him", "them", "us", "who", "whom", "i", "me",
    "ifsc", "pan", "uin", "uid", "dob", "cvv", "otp", "pin", "atm",
    "aadhaar", "aadhar", "adhaar", "adhar",
    "card", "number", "account", "bank", "code", "linked", "unknown",
    "senior", "junior", "data", "new", "old", "former", "current",
    "direct", "personal", "corporate", "work", "office", "home",
    "india", "indian", "limited", "pvt", "llp", "group",
    "to", "this", "that", "these", "those", "been", "being",
    "not", "but", "also", "both", "between", "via", "per",
    "maharashtra", "karnataka", "tamilnadu", "kerala", "gujarat",
    "rajasthan", "punjab", "haryana", "uttarpradesh", "madhyapradesh",
    "westbengal", "odisha", "assam", "bihar", "jharkhand", "goa",
    "himachalpradesh", "uttarakhand", "telangana", "andhrapradesh",
    "manipur", "meghalaya", "mizoram", "nagaland", "sikkim", "tripura",
    "arunachalpradesh", "chhattisgarh", "delhi", "chandigarh",
    "road", "street", "avenue", "lane", "marg", "path", "way",
    "nagar", "colony", "sector", "block", "phase", "layout",
    "chowk", "cross", "main", "circle", "square", "place",
    "floor", "building", "tower", "complex", "plaza", "mall",
    "flat", "apartment", "house", "bungalow", "villa",
    "scientist", "engineer", "manager", "developer", "analyst",
    "director", "assistant", "associate", "consultant", "specialist",
    "coordinator", "executive", "officer", "president", "chairman",
    "founder", "partner", "intern", "trainee", "head", "lead",
    "salary", "transfer", "payment", "transaction", "amount",
    "access", "login", "attempt", "flagged", "suspended", "pending",
}

PRONOUNS = {
    "he", "she", "they", "we", "it", "his", "her", "their", "our",
    "my", "your", "him", "them", "us", "who", "whom", "i", "me",
    "myself", "yourself", "himself", "herself", "itself", "themselves",
}

food_words = {"fruit", "eat", "tasty", "juice", "food", "sweet", "ripe"}

def detect_org_entities(text):
    nlp = get_spacy_model()
    nlp.max_length = 2000000
    entities = []
    seen_spans = set()
    full_text_lower = text.lower()
    doc = nlp(text)

    for ent in doc.ents:
        if ent.label_ != "ORG":
            continue
        val = ent.text.lower()

        if val in STOP_WORDS or val in PRONOUNS:
            continue

        if ent.text.isupper() and len(ent.text) <= 5 and val not in ORG_WHITELIST:
            continue

        words = val.split()
        if all(w in INDIAN_NAMES for w in words if len(w) >= 3):
            continue

        if len(words) == 1 and words[0] in INDIAN_NAMES:
            continue

        if any(w in STOP_WORDS for w in words):
            continue

        has_food_context = any(
            any(fw in full_text_lower[max(0, m.start()-60):m.end()+60] for fw in food_words)
            for m in re.finditer(re.escape(val), full_text_lower)
        )
        if has_food_context and not any(suffix in val.split() for suffix in ["inc", "ltd", "corp", "co"]):
            continue

        span = (ent.start_char, ent.end_char)
        if span in seen_spans:
            continue

        entities.append({
            "text": ent.text,
            "type": "ORG",
            "start": ent.start_char,
            "end": ent.end_char,
            "confidence": 0.85,
        })
        seen_spans.add(span)

    for match in re.finditer(r"\b[a-zA-Z]+\b", text):
        word = match.group()
        val = word.lower()
        if val not in ORG_WHITELIST:
            continue

        span = (match.start(), match.end())
        if span in seen_spans:
            continue

        immediate_context = full_text_lower[max(0, match.start()-25):match.end()+25]
        if any(fw in immediate_context for fw in food_words):
            seen_spans.add(span)
            continue

        entities.append({
            "text": word,
            "type": "ORG",
            "start": match.start(),
            "end": match.end(),
            "confidence": 0.8,
        })
        seen_spans.add(span)

    return entities


def boost_org_detection(text, entities):
    tree = build_entity_tree(entities)
    tokens = [(m.group(), m.start(), m.end()) for m in re.finditer(r"\b[a-zA-Z]+\b", text)]
    new_entities = []

    for i, (word, word_start, word_end) in enumerate(tokens):
        clean = word.lower()

        if len(clean) < 3:
            continue

        if clean in STOP_WORDS or clean in ORG_HINT_WORDS:
            continue

        if clean in INDIAN_NAMES or clean in INDIAN_CITIES:
            continue

        if overlaps_tree(tree, word_start, word_end):
            continue

        window_start = max(0, i - 5)
        window_end = min(len(tokens), i + 6)
        context_window = " ".join(t[0] for t in tokens[window_start:window_end]).lower()

        if any(w in context_window for w in food_words):
            continue

        raw_context = text[max(0, word_start - 60):word_end + 60].lower()
        if any(fw in raw_context for fw in food_words):
            continue

        if clean in ORG_WHITELIST or any(p in context_window for p in ORG_HINT_PHRASES):
            new_entity = {
                "text": word,
                "type": "ORG",
                "start": word_start,
                "end": word_end,
                "confidence": 0.85 if clean in ORG_WHITELIST else 0.7,
            }
            new_entities.append(new_entity)
            tree[word_start:word_end] = new_entity

    return new_entities


def filter_org_entities(entities, text):
    res = []
    for e in entities:
        if e["type"] != "ORG":
            res.append(e)
            continue

        val = e["text"].lower()

        if any(suffix in val.split() for suffix in ["inc", "ltd", "corp", "co"]):
            res.append(e)
            continue

        if val in STOP_WORDS or val in PRONOUNS or val in INDIAN_CITIES:
            continue

        if e["text"].isupper() and len(e["text"]) <= 5 and val not in ORG_WHITELIST:
            continue

        if val in INDIAN_NAMES:
            continue

        if val in ["is", "a", "the", "hired", "joined", "works", "company"]:
            continue

        words = val.split()
        if len(words) == 1:
            context = text[max(0, e["start"]-15):e["end"]+15].lower()
            if any(w in context for w in ["eat", "fruit", "tasty", "juice"]):
                continue

        res.append(e)

    return res


def split_compound_orgs(entities):
    result = []
    for e in entities:
        if e["type"] != "ORG":
            result.append(e)
            continue

        parts = re.split(r'\s+(?:vs\.?|versus)\s+', e["text"], flags=re.IGNORECASE)

        if len(parts) < 2:
            result.append(e)
            continue

        for part in parts:
            part_start = e["text"].find(part)
            result.append({
                "text": part,
                "type": "ORG",
                "start": e["start"] + part_start,
                "end": e["start"] + part_start + len(part),
                "confidence": e["confidence"],
            })

    return result