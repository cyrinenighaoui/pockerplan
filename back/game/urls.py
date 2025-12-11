
from django.urls import path
from .views import  create_room, export_results, get_current_task, get_votes, join_room, get_room, kick_player, promote_player, reveal_votes, set_backlog, get_backlog, start_game, submit_vote

urlpatterns = [
    path("rooms/create/", create_room),
    path("rooms/join/", join_room),
    path("rooms/<str:code>/", get_room),
    path("rooms/<str:code>/backlog/", set_backlog),   # POST (upload/remplace)
    path("rooms/<str:code>/backlog/export/", get_backlog),  # GET (télécharger)
    path("rooms/<str:code>/vote/", submit_vote),
    path("rooms/<str:code>/votes/", get_votes),
    path("rooms/<str:code>/current/", get_current_task),
    path("rooms/<str:code>/reveal/", reveal_votes),
    path("rooms/<str:code>/export/", export_results),
    path("rooms/<str:code>/start/", start_game),  # ✅ ICI !
    path("rooms/<str:code>/kick/", kick_player),
    path("rooms/<str:code>/promote/", promote_player),

]
