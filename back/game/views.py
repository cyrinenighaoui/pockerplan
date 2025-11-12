from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Room, Vote
from .serializers import RoomCreateSerializer, RoomDetailSerializer
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_game(request, code):
    try:
        room = Room.objects.get(code=code.upper())
        username = request.user.username
        is_admin = any(
            p.get("username") == username and p.get("role") == "admin"
            for p in room.players
        )
        if not is_admin:
            return Response({"error": "Only admin can start the game"}, status=403)

        room.started = True
        room.save()

        return Response({"success": True, "started": True})
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_room(request):
    """
    BODY: { "mode": "strict" | "average" | "median" | "majority" }
    """
    mode = request.data.get("mode")
    if mode not in ["strict", "average", "median", "majority"]:
        return Response({"error": "Invalid mode"}, status=400)

    user = request.user
    room = Room.objects.create(
        mode=mode,
        creator=user,
        players=[{ "username": user.username, "role": "admin" }]
    )
    return Response(RoomCreateSerializer(room).data, status=201)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def join_room(request):
    """
    BODY: { "code": "ABC123" }
    """
    code = request.data.get("code", "").strip().upper()
    if not code:
        return Response({"error": "Room code required"}, status=400)

    room = get_object_or_404(Room, code=code)
    username = request.user.username

    # Déjà présent ?
    for p in room.players:
        if p.get("username") == username:
            return Response({"status": "already_joined", "code": room.code})

    room.players.append({ "username": username, "role": "player" })
    room.save()
    return Response({"status": "joined", "code": room.code})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_room(request, code):
    room = get_object_or_404(Room, code=code.upper())
    return Response(RoomDetailSerializer(room).data)
def _validate_backlog(payload):
    """
    payload: list[dict] with at least a title
    returns (ok, normalized_list | error_msg)
    """
    if not isinstance(payload, list) or len(payload) == 0:
        return False, "Backlog must be a non-empty array"

    normalized = []
    for i, item in enumerate(payload, start=1):
        if not isinstance(item, dict):
            return False, f"Item #{i} must be an object"
        title = item.get("title")
        if not title or not isinstance(title, str) or len(title.strip()) == 0:
            return False, f"Item #{i} is missing a valid 'title'"

        normalized.append({
            "id": item.get("id", str(uuid.uuid4())),
            "title": title.strip()[:200],
            "description": (item.get("description") or "").strip()[:2000],
        })
    return True, normalized
def _validate_backlog(payload):
    """
    payload: list[dict] with at least a title
    returns (ok, normalized_list | error_msg)
    """
    if not isinstance(payload, list) or len(payload) == 0:
        return False, "Backlog must be a non-empty array"

    normalized = []
    for i, item in enumerate(payload, start=1):
        if not isinstance(item, dict):
            return False, f"Item #{i} must be an object"
        title = item.get("title")
        if not title or not isinstance(title, str) or len(title.strip()) == 0:
            return False, f"Item #{i} is missing a valid 'title'"

        normalized.append({
            "external_id": item.get("id") or str(uuid.uuid4()),
            "title": title.strip()[:255],
            "description": (item.get("description") or "").strip()[:2000],
            "order": item.get("order", i),
        })
    return True, normalized


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_backlog(request, code: str):
    """
    BODY: JSON array of features [{id?, title, description?}, ...]
    Replaces the room backlog and resets progress (current_task_index = 0)
    """
    room = get_object_or_404(Room, code=code.upper())

    # sécurité: seuls admin/creator peuvent uploader
    username = request.user.username
    is_admin = any(p.get("username") == username and p.get("role") == "admin" for p in room.players)
    if not is_admin and room.creator.username != username:
        return Response({"error": "Only room admin can set backlog"}, status=403)

    ok, result = _validate_backlog(request.data)
    if not ok:
        return Response({"error": result}, status=400)

    room.backlog = result
    room.current_task_index = 0
    room.save()
    return Response({"status": "backlog_set", "count": len(result)})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_backlog(request, code: str):
    room = get_object_or_404(Room, code=code.upper())
    return Response(room.backlog or [])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_vote(request, code):
    room = get_object_or_404(Room, code=code.upper())
    index = room.current_task_index
    user = request.user.username
    value = request.data.get("value")

    # validation
    valid_values = ["1","2","3","5","8","13","20","40","100","coffee"]
    if value not in valid_values:
        return Response({"error": "Invalid vote"}, status=400)

    # delete previous vote of this player for this task
    Vote.objects.filter(room=room, username=user, task_index=index).delete()

    Vote.objects.create(room=room, username=user, task_index=index, value=value)
    return Response({"status": "ok"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_votes(request, code):
    room = get_object_or_404(Room, code=code.upper())
    
    # Vérifier que l'utilisateur est dans la room
    user_in_room = any(
        p.get("username") == request.user.username 
        for p in room.players
    )
    
    if not user_in_room:
        return Response({"error": "Not in room"}, status=403)

    index = room.current_task_index
    votes = Vote.objects.filter(room=room, task_index=index)
    return Response({v.username: v.value for v in votes})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_task(request, code):
    room = get_object_or_404(Room, code=code.upper())
    idx = room.current_task_index
    if idx >= len(room.backlog):
        return Response({"done": True})
    return Response(room.backlog[idx])


def _calculate_result(room, votes):
    values = [v.value for v in votes if v.value != "coffee"]

    # Si tout le monde a voté café
    if len(values) == 0:
        return "coffee"

    mode = room.mode

    # STRICT
    if mode == "strict":
        if len(set(values)) == 1:
            return values[0]
        return None  # pas unanimité => revote

    # OTHER MODES (Average / Median / Majority)
    numbers = list(map(int, values))

    if mode == "average":
        avg = sum(numbers) / len(numbers)
        return str(round(avg))  # simplifié: arrondi standard

    if mode == "median":
        sorted_vals = sorted(numbers)
        mid = len(numbers) // 2
        return str(sorted_vals[mid])

    if mode == "majority":
        return max(set(values), key=values.count)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reveal_votes(request, code):
    room = get_object_or_404(Room, code=code.upper())
    idx = room.current_task_index
    user = request.user.username

    # admin only
    is_admin = any(p.get("username") == user and p.get("role") == "admin" for p in room.players)
    if not is_admin:
        return Response({"error": "Only admin can reveal"}, status=403)

    votes = Vote.objects.filter(room=room, task_index=idx)
    players_in_room = len(room.players)

    if votes.count() < players_in_room:
        return Response({"error": "Waiting for all players"}, status=400)

    result = _calculate_result(room, votes)

    if result is None:
        return Response({"status": "revote"})

    # On applique la note au backlog
    room.backlog[idx]["estimate"] = result
    room.current_task_index += 1
    room.save()

    Vote.objects.filter(room=room, task_index=idx).delete()

    return Response({"status": "validated", "result": result})
@api_view(["GET"])
def export_results(request, code: str):
    room = get_object_or_404(Room, code=code.upper())

    return Response({
        "room": room.code,
        "mode": room.mode,
        "results": room.backlog  # contient les estimates
    })
