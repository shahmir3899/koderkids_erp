from django.urls import path
from .views import robot_reply

urlpatterns = [
    path("robot-reply/", robot_reply, name="robot-reply"),
]
