from django.apps import AppConfig

print("IMPORTINGAPPS")

class ManagementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'management'
