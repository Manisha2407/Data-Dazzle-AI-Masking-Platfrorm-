from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from ..recognizers.custom_recognizers import get_custom_recognizers

_analyzer = None

EXCLUDED_ENTITIES = {"NRP"}

def get_analyzer():
    global _analyzer
    if _analyzer is None:
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers()
        allowed = {
            "PERSON",
            "EMAIL_ADDRESS",
            "LOCATION",
            "DATE_TIME",
            "CREDIT_CARD",
            "URL",
            "IP_ADDRESS",
            "MAC_ADDRESS",
            "CRYPTO"
        }

        registry.recognizers = [
            r for r in registry.recognizers
            if any(ent in allowed for ent in r.supported_entities)
        ]
        for rec in get_custom_recognizers():
            registry.add_recognizer(rec)

        for r in registry.recognizers:
            if hasattr(r, 'supported_entities'):
                r.supported_entities = [e for e in r.supported_entities if e not in EXCLUDED_ENTITIES]

        # for r in registry.recognizers:
        #     print(type(r).__name__, r.supported_entities)

        _analyzer = AnalyzerEngine(registry=registry)

    return _analyzer

def get_spacy_model():
    analyzer = get_analyzer()
    return analyzer.nlp_engine.nlp["en"]

def detect_pii(text, entities=None, confidence=70):
    analyzer = get_analyzer()
    results = analyzer.analyze(text=text, language="en", entities=entities)
    # for r in results:
    #     print("raw results: ",r.entity_type, text[r.start,r.end])
    return [
        {
            "text": text[r.start:r.end],
            "type": r.entity_type,
            "start": r.start,
            "end": r.end,
            "confidence": r.score,
        }
        for r in results
        if r.entity_type not in EXCLUDED_ENTITIES
        and r.score >= confidence / 100
    ]