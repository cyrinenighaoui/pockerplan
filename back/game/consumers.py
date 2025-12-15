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
        self.username = qs.get("username", ["anonymous"])[0]

        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

        await self.group_send("presence", {
            "username": self.username,
            "online": True
        })

        room = await self.get_room()
        payload = await self.current_payload(room)

        # ✅ UN SEUL SNAPSHOT
        await self.send_json({
            "type": "snapshot",
            **payload,
            "is_paused": room.is_paused,
            "paused_by": room.paused_by
        })

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
            
            # ✅ RÉCUPÉREZ LES VOTES ACTUALISÉS POUR TOUS LES JOUEURS
            votes_data = await self.get_current_votes()
            
            # Envoyez les votes mis à jour à TOUT LE MONDE
            await self.channel_layer.group_send(self.group, {
                "type": "votes_updated",
                "votes": votes_data,
                "counts": counts
            })
            
            # Broadcast "voted" progress
            print(f"🎯 [IA DEBUG] Vote reçu - {counts['voters']}/{counts['total']} votes")
            
            if counts["voters"] >= counts["total"]:
                print("🎯 [IA] Tous ont voté - envoi de l'analyse TEST...")
                
                await self.channel_layer.group_send(self.group, {
                    "type": "ai_analysis_event",
                    "analysis": "🤖 ANALYSE IA : Divergence détectée ! Certains voient des complexités API cachées. Estimation recommandée : 8 points.",
                    "vote_summary": {"5": 2, "8": 1, "13": 2},
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
            print("👀 REVEAL RECEIVED FROM", self.username)
            
            room = await self.get_room()
            
            if room.is_paused:
                await self.send_json({"type": "error", "message": "Session en pause"})
                return
            
            if not await self.is_admin(self.username):
                await self.send_json({"type": "error", "message": f"Not admin: {self.username}"})
                return
            
            # ✅ VÉRIFIER SI TOUS ONT VOTÉ
            counts = await self.vote_counts()
            if counts["voters"] < counts["total"]:
                await self.send_json({
                    "type": "error", 
                    "message": f"Attendez que tout le monde vote ! ({counts['voters']}/{counts['total']})"
                })
                return
            
            res = await self.reveal_logic()
            
            await self.channel_layer.group_send(self.group, {
                "type": "reveal_broadcast",
                "status": res.get("status"),
                "result": res.get("result")
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
    async def pause_event(self, event):
        await self.send_json({
            "type": "pause_event",
            "paused_by": event.get("paused_by")
        })
    async def reveal_broadcast(self, event):
        """Handler spécial pour le reveal qui envoie directement 'reveal'"""
        await self.send_json({
            "type": "reveal",
            "status": event.get("status"),
            "result": event.get("result")
        })
    async def votes_updated(self, event):
        """Envoie les votes mis à jour à tous les clients"""
        await self.send_json({
            "type": "votes_updated",
            "votes": event["votes"],
            "counts": event["counts"]
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
    def get_current_votes(self):
        """Récupère tous les votes actuels"""
        room = Room.objects.get(code=self.code)
        idx = room.current_task_index
        votes = Vote.objects.filter(room=room, task_index=idx)
        
        # Format: {username: vote_value}
        votes_dict = {}
        for vote in votes:
            votes_dict[vote.username] = vote.value
        
        return votes_dict
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

        # DEBUG: Afficher ce qu'on a
        print(f"🔧 [DEBUG] Room {self.code} - Mode: {room.mode}")
        print(f"🔧 [DEBUG] Votes reçus: {[(v.username, v.value) for v in votes]}")
        
        values = [v.value for v in votes if v.value != "coffee"]

        # CAS 1 : aucun vote → skip
        if len(values) == 0:
            room.current_task_index += 1
            room.save()
            return {"status": "skipped"}

        # CAS 2 : votes partiels AUTORISÉS si force
        if not force:
            if len(votes) < len(room.players):
                return {"status": "wait"}

        # ✅ CORRECTION COMPLÈTE POUR TOUS LES MODES
        
        if room.mode == "strict":
            print("🔧 [DEBUG] Mode STRICT activé")
            
            # En mode strict, on exclut les votes "coffee" de la décision
            # mais ils comptent comme une participation
            
            # Vérifier si TOUS les votes non-coffee sont identiques
            unique_values = set(values)
            print(f"🔧 [DEBUG] Valeurs uniques (sans coffee): {unique_values}")
            
            if len(unique_values) == 1:
                # TOUT LE MONDE EST D'ACCORD
                result = list(unique_values)[0]
                print(f"🔧 [DEBUG] Accord trouvé: {result}")
            else:
                # DIVERGENCE → ON REVOTE
                print(f"🔧 [DEBUG] Divergence détectée: {unique_values}")
                Vote.objects.filter(room=room, task_index=idx).delete()
                return {"status": "revote"}
                
        elif room.mode == "average":
            print("🔧 [DEBUG] Mode AVERAGE activé")
            nums = list(map(int, values))
            result = str(round(sum(nums) / len(nums)))
            
        elif room.mode == "median":
            print("🔧 [DEBUG] Mode MEDIAN activé")
            nums = sorted(map(int, values))
            result = str(nums[len(nums)//2])
            
        else:  # mode "majority" (par défaut)
            print("🔧 [DEBUG] Mode MAJORITY activé")
            from collections import Counter
            counter = Counter(values)
            print(f"🔧 [DEBUG] Comptage: {counter}")
            
            if counter:
                most_common = counter.most_common(1)[0]
                result = most_common[0]
                print(f"🔧 [DEBUG] Majorité: {result} ({most_common[1]} votes)")
            else:
                result = values[0] if values else "0"

        print(f"🔧 [DEBUG] Résultat final: {result}")
        
        room.backlog[idx]["estimate"] = result
        room.current_task_index += 1
        room.save()
        Vote.objects.filter(room=room, task_index=idx).delete()

        return {"status": "validated", "result": result}