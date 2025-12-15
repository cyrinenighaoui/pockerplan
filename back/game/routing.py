from django.urls import path
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/rooms/(?P<code>\w+)/$", consumers.RoomConsumer.as_asgi()),
]