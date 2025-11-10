from rest_framework import serializers
from .models import BacklogItem, Room

class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["code", "mode"]

class RoomDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["code", "mode", "players", "backlog", "current_task_index", "created_at"]
class BacklogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BacklogItem
        fields = ["id", "external_id", "title", "description", "order", "created_at"]
