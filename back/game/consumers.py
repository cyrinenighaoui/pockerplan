import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Room, Vote
from django.shortcuts import get_object_or_404

class RoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.code = self.scope["url_route"]["kwargs"]["code"].upper()
        qs = parse_qs(self.scope["query_string"].decode())
        self.username = (qs.get("username", ["anonymous"])[0] or "anonymous")

        # (Optional) You can verify JWT here if you pass ?token=...
        # For local class demo, we accept and rely on REST auth for protected actions.
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

        # Mark presence ON (frontend keeps an online set)
        await self.group_send("presence", {"username": self.username, "online": True})

        # Send current task + simple counts on connect
        room = await self.get_room()
        payload = await self.current_payload(room)
        await self.send_json({"type": "snapshot", **payload})

    @property
    def group(self):
        return f"room_{self.code}"

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group, self.channel_name)
        await self.group_send("presence", {"username": self.username, "online": False})

    async def receive_json(self, content, **kwargs):
        t = content.get("type")

        if t == "vote":
            value = content.get("value")
            await self.save_vote(self.username, value)
            # Broadcast “voted” progress (counts only, votes hidden)
            counts = await self.vote_counts()
            await self.group_send("voted", counts)

        elif t == "reveal":
            # Only admin allowed (check)
            if not await self.is_admin(self.username):
                await self.send_json({"type": "error", "message": "Only admin can reveal"})
                return

            res = await self.reveal_logic()
            # Broadcast result and next task (or done)
            await self.channel_layer.group_send(self.group, {
                "type": "reveal_event",
                **res
            })

        elif t == "start":  # optional, to push current task to everyone
            room = await self.get_room()
            payload = await self.current_payload(room)
            await self.channel_layer.group_send(self.group, {
                "type": "push_snapshot",
                **payload
            })

    # ---------- Group send wrappers ----------
    async def group_send(self, kind, data):
        await self.channel_layer.group_send(self.group, {"type": f"{kind}_event", **data})

    async def presence_event(self, event):
        await self.send_json({"type": "presence", **event})

    async def voted_event(self, event):
        await self.send_json({"type": "voted", **event})

    async def push_snapshot(self, event):
        await self.send_json({"type": "snapshot", **event})

    async def reveal_event(self, event):
        await self.send_json({"type": "reveal", **event})


    # ---------- DB helpers ----------
    @database_sync_to_async
    def get_room(self):
        return get_object_or_404(Room, code=self.code)

    @database_sync_to_async
    def is_admin(self, username):
        room = Room.objects.get(code=self.code)
        return any(p.get("username") == username and p.get("role") == "admin" for p in room.players)

    @database_sync_to_async
    def current_payload(self, room):
        idx = room.current_task_index
        backlog = room.backlog or []
        if idx >= len(backlog):
            return {"done": True, "current": None, "total": len(backlog), "index": idx}
        return {
            "done": False,
            "current": backlog[idx],
            "total": len(backlog),
            "index": idx + 1   # 1-based for UI
        }

    @database_sync_to_async
    def save_vote(self, username, value):
        room = Room.objects.get(code=self.code)
        valid = ["1","2","3","5","8","13","20","40","100","coffee"]
        if value not in valid:
            return
        idx = room.current_task_index
        Vote.objects.filter(room=room, username=username, task_index=idx).delete()
        Vote.objects.create(room=room, username=username, task_index=idx, value=value)

    @database_sync_to_async
    def vote_counts(self):
        room = Room.objects.get(code=self.code)
        idx = room.current_task_index
        total = len(room.players)
        count = Vote.objects.filter(room=room, task_index=idx).count()
        return {"voters": count, "total": total}

    @database_sync_to_async
    def reveal_logic(self):
        room = Room.objects.get(code=self.code)
        idx = room.current_task_index
        votes = list(Vote.objects.filter(room=room, task_index=idx))
        total = len(room.players)
        if len(votes) < total:
            return {"status": "wait"}

        values = [v.value for v in votes if v.value != "coffee"]
        if len(values) == 0:
            # all coffee: keep progress, just signal pause
            return {"status": "coffee"}

        if room.mode == "strict":
            result = values[0] if len(set(values)) == 1 else None
        else:
            nums = list(map(int, values))
            if room.mode == "average":
                from statistics import mean
                result = str(round(mean(nums)))
            elif room.mode == "median":
                from statistics import median
                result = str(int(median(nums)))
            else:  # majority
                result = max(set(values), key=values.count)

        if result is None:
            # revote
            Vote.objects.filter(room=room, task_index=idx).delete()
            return {"status": "revote"}

        # Apply result, advance
        room.backlog[idx]["estimate"] = result
        room.current_task_index += 1
        room.save()
        Vote.objects.filter(room=room, task_index=idx).delete()

        # Next snapshot
        done = room.current_task_index >= len(room.backlog)
        next_item = None if done else room.backlog[room.current_task_index]
        return {"status": "validated", "result": result, "done": done, "next": next_item}
