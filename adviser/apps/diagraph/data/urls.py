from django.urls import path
from .chatView import chat_view


urlpatterns = [
    path("chat/", chat_view, name='chat'),
]