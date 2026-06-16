import json
from django.http import JsonResponse

def validate_json(view_func):
    def wrapper(req,*args,**kwargs):
        if req.method=="GET":
            return view_func(req,*args,**kwargs)
        if req.method!="POST":
            return JsonResponse({"error":"Only POST allowed"},status=405)
        try:
            body=json.loads(req.body)
        except json.JSONDecodeError:
            return JsonResponse({"error":"Invalid JSON"},status=400)
        text=body.get("text")
        if not text:
            return JsonResponse({"error":"Text is required"},status=400)
        
        req.cleaned_data=body
        return view_func(req,*args,**kwargs)
    return wrapper