from django.urls import path
from .chatView import chat_view
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path("chat/", chat_view, name='chat'),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)