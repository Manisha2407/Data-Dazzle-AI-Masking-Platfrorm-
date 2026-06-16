from presidio_analyzer import PatternRecognizer, Pattern


def get_custom_recognizers():
    aadhaar_pattern = Pattern(
        name="aadhaar_pattern",
        regex=r"\b[2-9]\d{3}\s\d{4}\s\d{4}\b",
        score=0.85
    )
    aadhaar_recognizer = PatternRecognizer(
        supported_entity="AADHAAR",
        patterns=[aadhaar_pattern]
    )
    pan_pattern = Pattern(
        name="pan_pattern",
        regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
        score=0.85
    )
    pan_recognizer = PatternRecognizer(
        supported_entity="PAN",
        patterns=[pan_pattern]
    )
    phone_pattern = Pattern(
        name="phone_pattern",
        regex=r"(?<!\w)(?:\+91[-\s]?|0)?[6-9]\d{4}[-\s]?\d{5}\b",
        score=0.9
    )
    phone_recognizer = PatternRecognizer(
        supported_entity="PHONE_NUMBER",
        patterns=[phone_pattern]
    )
    url_pattern = Pattern(
        name="url_pattern",
        regex=r"(?i)\b((?:https?:\/\/|www\.)[^\s]+)",
        score=0.9
    )
    url_recognizer = PatternRecognizer(
        supported_entity="URL",
        patterns=[url_pattern]
    )
    bank_pattern = Pattern(
        name="bank_pattern",
        regex=r"\b\d{10,18}\b",
        score=0.5
    )
    bank_recognizer = PatternRecognizer(
        supported_entity="BANK_ACCOUNT",
        patterns=[bank_pattern],
        context=["bank", "account", "acc", "ifsc"]
    )
    domain_pattern = Pattern(
        name="domain_pattern",
        regex=r"\b[a-zA-Z0-9.-]+\.(com|org|net|io|in|co|uk)\b",
        score=0.85
    )
    domain_recognizer = PatternRecognizer(
        supported_entity="DOMAIN",
        patterns=[domain_pattern]
    )
    pincode_pattern = Pattern(
        name="pincode_pattern",
        regex=r"\b\d{5,6}\b",
        score=0.8
    )
    pincode_recognizer = PatternRecognizer(
        supported_entity="PINCODE",
        patterns=[pincode_pattern]
    )
    ifsc_pattern = Pattern(
        name="ifsc_pattern",
        regex=r"\b[A-Z]{4}0\d{6}\b",
        score=0.9
    )
    ifsc_recognizer = PatternRecognizer(
        supported_entity="IFSC_CODE",
        patterns=[ifsc_pattern]
    )

    return [
        aadhaar_recognizer,
        pan_recognizer,
        phone_recognizer,
        url_recognizer,
        bank_recognizer,
        domain_recognizer,
        pincode_recognizer,
        ifsc_recognizer
    ]