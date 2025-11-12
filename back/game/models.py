from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User
import string, random

def generate_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

class Room(models.Model):
    code = models.CharField(max_length=10, unique=True, default=generate_code)
    mode = models.CharField(max_length=20)  # "strict" | "average" | "median" | "majority"
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_rooms")
    players = models.JSONField(default=list)      # [{ "username": "...", "role": "admin|player" }]
    backlog = models.JSONField(default=list)      # [{ id, title, description }]
    current_task_index = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    started = models.BooleanField(default=False)  # ✅ important

    def __str__(self):
        return f"Room {self.code} ({self.mode})"

class BacklogItem(models.Model):
    """
    Normalized backlog items stored one-per-row, linked to a Room.
    Keeps id/title/description and an optional ordering/index.
    """
    room = models.ForeignKey(Room, related_name="items", on_delete=models.CASCADE)
    external_id = models.CharField(max_length=100, blank=True, null=True)  # could store incoming id
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)  # optional ordering
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.room.code}] {self.title}"
class Vote(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    username = models.CharField(max_length=255)
    task_index = models.IntegerField()
    value = models.CharField(max_length=20)  # ex: "5", "8", "coffee"

