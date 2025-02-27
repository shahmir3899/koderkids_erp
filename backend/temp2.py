import os
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "school_management.settings") 
django.setup()

from django.apps import apps

# Get all registered models
models = apps.get_models()

# Print model names and their fields
for model in models:
    print(f"Model: {model.__name__}")
    for field in model._meta.fields:
        print(f"  - {field.name} ({field.get_internal_type()})")
