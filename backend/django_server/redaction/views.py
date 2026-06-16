from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .decorators import validate_json
from .engine import process_text


@csrf_exempt
@validate_json
def redact_view(req):
    if req.method == "GET":
        return JsonResponse({"status": "ok"})
    data = req.cleaned_data
    text = data.get("text", "")
    method = data.get("method", "hash")
    confidence = data.get("confidence", 70)
    entity_types = data.get("entities", None)
    print("METHOD:", method)
    # print("ENTITIES:", entity_types)
    res = process_text(
        text=text,
        method=method,
        confidence=confidence,
        entities=entity_types
    )

    return JsonResponse(res)