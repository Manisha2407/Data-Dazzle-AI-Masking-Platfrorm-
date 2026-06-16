from django.urls import path
from .views import redact_view

urlpatterns=[
    path("redact/", redact_view, name="redact"),
    path("health/", redact_view),
]