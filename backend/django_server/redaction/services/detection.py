from .analyzer import get_analyzer

EXCLUDED_ENTITIES = {"NRP"}

def detect_pii(text, language="en", entities=None, confidence=70):
    analyzer = get_analyzer()
    threshold = normalize_confidence(confidence)

    results = analyzer.analyze(
        text=text,
        language=language,
        entities=entities,
        score_threshold=threshold
    )

    # for r in results:
    #     print("RAW:", r.entity_type, text[r.start:r.end], r.score)
    parsed = [
        {
            "text": text[r.start:r.end],
            "type": r.entity_type,
            "start": r.start,
            "end": r.end,
            "confidence": round(r.score, 2),
        }
        for r in results
        if r.entity_type not in EXCLUDED_ENTITIES
    ]

    parsed.sort(key=lambda x: x["start"])
    return parsed

def normalize_confidence(conf):
    try:
        conf = float(conf)
        if conf > 1:
            return min(max(conf / 100, 0.0), 1.0)
        return min(max(conf, 0.0), 1.0)
    except:
        return 0.7