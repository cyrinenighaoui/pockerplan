from django.urls import path
from .consumers import GameConsumer, RoomConsumer

websocket_urlpatterns = [
    path("ws/rooms/<str:code>/", RoomConsumer.as_asgi()),
    path("ws/rooms/<str:code>/", GameConsumer.as_asgi()),  # 👈 changer ici

]
