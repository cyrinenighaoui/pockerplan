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

        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

        # Mark presence ON
        await self.group_send("presence", {"username": self.username, "online": True})
        room = await self.get_room()
        payload = await self.current_payload(room)

        await self.send_json({
            "type": "snapshot",
            **payload,
            "is_paused": room.is_paused,
            "paused_by": room.paused_by
        })

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
            room = await self.get_room()

            if room.is_paused:
                print("⛔ Vote ignoré – room en pause")
                return  

            value = content.get("value")
            await self.save_vote(self.username, value)

            counts = await self.vote_counts()
            await self.group_send("voted", counts)
            # Broadcast "voted" progress
          
            #  CORRECTION : Envoi direct de l'analyse IA pour TEST
            print(f"🎯 [IA DEBUG] Vote reçu - {counts['voters']}/{counts['total']} votes")
            
            if counts["voters"] >= counts["total"]:
                print("🎯 [IA] Tous ont voté - envoi de l'analyse TEST...")
                
                # Envoi direct SANS appel API (pour tester)
                await self.channel_layer.group_send(self.group, {
                    "type": "ai_analysis_event",
                    "analysis": "🤖 ANALYSE IA : Divergence détectée ! Certains voient des complexités API cachées. Estimation recommandée : 8 points.",
                    "vote_summary": {"5": 2, "8": 1, "13": 2},  # Données exemple
                    "total_votes": counts["voters"],
                    "required_votes": counts["total"]
                })
        elif t == "coffee":
            room = await self.get_room()
            room.is_paused = True
            room.paused_by = self.username
            await database_sync_to_async(room.save)()

            await self.channel_layer.group_send(self.group, {
                "type": "pause_event",
                "paused_by": self.username
            })

        elif t == "resume":
            room = await self.get_room()
            room.is_paused = False
            room.paused_by = None
            await database_sync_to_async(room.save)()

            await self.channel_layer.group_send(self.group, {
                "type": "resume_event"
            })
        elif t == "force_reveal":
            room = await self.get_room()

            if room.is_paused:
                return

            #  PAS besoin d’être admin (c’est le timer)
            res = await self.reveal_logic(force=True)

            await self.channel_layer.group_send(self.group, {
                "type": "reveal_event",
                **res
            })

        elif t == "reveal":
            room = await self.get_room()

            if room.is_paused:
                await self.send_json({
                    "type": "error",
                    "message": "Session en pause"
                })
                return

            if not await self.is_admin(self.username):
                return

            res = await self.reveal_logic()
            await self.channel_layer.group_send(self.group, {
                "type": "reveal_event",
                **res
            })

        elif t == "start":
            room = await self.get_room()
            payload = await self.current_payload(room)
            await self.channel_layer.group_send(self.group, {
                "type": "push_snapshot",
                **payload
            })

        # Gestion du chat
        elif t == "chat":
            print(f"💬 Chat message from {self.username}: {content.get('message')}")
            await self.channel_layer.group_send(self.group, {
                "type": "chat_event",
                "username": self.username,
                "message": content.get("message")
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

    async def chat_event(self, event):
        await self.send_json({
            "type": "chat",
            "username": event["username"],
            "message": event["message"]
        })
    async def resume_event(self, event):
        await self.send_json({
            "type": "resume_event"
        })

    #  AJOUT : Handler pour l'analyse IA
    async def ai_analysis_event(self, event):
        print("🤖 [IA] Envoi de l'analyse au frontend...")
        await self.send_json({
            "type": "ai_analysis",
            "analysis": event["analysis"],
            "vote_summary": event.get("vote_summary", {}),
            "total_votes": event.get("total_votes", 0),
            "required_votes": event.get("required_votes", 0)
        })

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
            "index": idx + 1
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
    def reveal_logic(self, force=False):
        room = Room.objects.get(code=self.code)
        idx = room.current_task_index
        votes = list(Vote.objects.filter(room=room, task_index=idx))

        values = [v.value for v in votes if v.value != "coffee"]

        #  CAS 1 : aucun vote → skip
        if len(values) == 0:
            room.current_task_index += 1
            room.save()
            return {"status": "skipped"}

        #  CAS 2 : votes partiels AUTORISÉS si force
        if not force:
            if len(votes) < len(room.players):
                return {"status": "wait"}

        # calcul normal
        if room.mode == "average":
            nums = list(map(int, values))
            result = str(round(sum(nums) / len(nums)))
        elif room.mode == "median":
            nums = sorted(map(int, values))
            result = str(nums[len(nums)//2])
        else:
            result = max(set(values), key=values.count)

        room.backlog[idx]["estimate"] = result
        room.current_task_index += 1
        room.save()
        Vote.objects.filter(room=room, task_index=idx).delete()

        return {"status": "validated", "result": result}
