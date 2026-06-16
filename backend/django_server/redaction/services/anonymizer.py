import hashlib
import random
import string
from faker import Faker

fake = Faker()
fake_cache = {}

def anonymize_text(text, entities, method="hash"):
    result = ""
    last_idx = 0

    for ent in entities:
        start = ent["start"]
        end = ent["end"]
        value = ent["text"]
        ent_type = ent["type"]

        result += text[last_idx:start]

        if method == "mask":
            replacement = f"[{ent_type}]"

        elif method == "hash":
            val = value
            if ent_type in ["CREDIT_CARD", "PHONE_NUMBER", "BANK_ACCOUNT", "AADHAAR", "PINCODE"]:
                val = "".join(filter(str.isdigit, val))
            elif ent_type in ["PAN", "IFSC_CODE"]:
                val = val.upper()

            key = val.lower() + "_" + ent_type
            hashed = hashlib.sha256(key.encode()).hexdigest()[:8]
            replacement = f"[{hashed}]"

        elif method == "remove":
            replacement = ""

        elif method == "fake":
            replacement = generate_fake(ent_type, value)

        else:
            replacement = f"[{ent_type}]"

        result += replacement
        last_idx = end

    result += text[last_idx:]
    return result


def generate_fake(ent_type, og_val):
    key = og_val.lower() + "_" + ent_type

    if key in fake_cache:
        return fake_cache[key]

    if ent_type == "PERSON":
        fake_val = fake.name()

    elif ent_type == "EMAIL_ADDRESS":
        fake_val = fake.email()

    elif ent_type == "PHONE_NUMBER":
        fake_val = fake.phone_number()

    elif ent_type == "LOCATION":
        fake_val = fake.city()

    elif ent_type == "IP_ADDRESS":
        fake_val = fake.ipv4()

    elif ent_type == "URL":
        fake_val = fake.url()

    elif ent_type == "DOMAIN":
        fake_val = fake.domain_name()

    elif ent_type == "DATE_TIME":
        fake_val = str(fake.date())

    elif ent_type == "CREDIT_CARD":
        fake_val = fake.credit_card_number()

    elif ent_type == "MAC_ADDRESS":
        fake_val = fake.mac_address()

    elif ent_type == "CRYPTO":
        fake_val = fake.sha256()

    elif ent_type == "BANK_ACCOUNT":
        fake_val = fake.bban()

    elif ent_type == "IFSC_CODE":
        fake_val = (
            "".join(random.choices(string.ascii_uppercase, k=4)) +
            "0" +
            "".join(random.choices(string.digits, k=6))
        )

    elif ent_type == "PINCODE":
        fake_val = "".join(random.choices(string.digits, k=6))

    elif ent_type == "AADHAAR":
        fake_val = f"{random.randint(1000,9999)} {random.randint(1000,9999)} {random.randint(1000,9999)}"

    elif ent_type == "PAN":
        fake_val = (
            "".join(random.choices(string.ascii_uppercase, k=5)) +
            str(random.randint(1000,9999)) +
            random.choice(string.ascii_uppercase)
        )
    
    elif ent_type == "ORG":
        fake_val = fake.company()

    else:
        fake_val = f"[FAKE_{ent_type}]"

    fake_cache[key] = fake_val
    return fake_val