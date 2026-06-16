from django.apps import AppConfig

class RedactionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "redaction"

    def ready(self):
        from .utils.helpers import load_indian_names, load_indian_cities
        load_indian_names()
        load_indian_cities()