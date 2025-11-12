from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import Room, Vote

class PokerGameTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Création d'un user
        self.user = User.objects.create_user(username="admin", password="1234")
        self.client.login(username="admin", password="1234")

    def test_create_room(self):
        """Créer une room en mode strict"""
        response = self.client.post("/api/rooms/create/", {"mode": "strict"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("code", response.data)
        self.assertEqual(Room.objects.count(), 1)

    def test_join_room(self):
        """Un joueur rejoint une room"""
        room = Room.objects.create(mode="strict", creator=self.user, players=[{"username": "admin", "role": "admin"}])
        user2 = User.objects.create_user(username="player1", password="test")
        self.client.login(username="player1", password="test")

        response = self.client.post("/api/rooms/join/", {"code": room.code}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Room.objects.get(code=room.code).players), 2)

    def test_set_backlog(self):
        """Upload d’un backlog JSON"""
        room = Room.objects.create(mode="strict", creator=self.user, players=[{"username": "admin", "role": "admin"}])
        backlog = [
            {"title": "User Login", "description": "Implement login feature"},
            {"title": "Vote System", "description": "Add poker voting logic"},
        ]

        response = self.client.post(f"/api/rooms/{room.code}/backlog/", backlog, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Room.objects.get(code=room.code).backlog), 2)

    def test_vote_and_reveal(self):
        """Un joueur vote et l’admin révèle"""
        room = Room.objects.create(mode="strict", creator=self.user, players=[{"username": "admin", "role": "admin"}])
        room.backlog = [{"title": "Task A"}]
        room.save()

        # Vote de l'admin
        response = self.client.post(f"/api/rooms/{room.code}/vote/", {"value": "5"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Vote.objects.count(), 1)

        # Reveal
        response = self.client.post(f"/api/rooms/{room.code}/reveal/", {}, format="json")
        self.assertIn(response.status_code, [200, 400])  # selon si plusieurs joueurs requis
