"""
ASGI config for agilecards project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application

# Configure Django settings FIRST
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agilecards.settings")
django.setup()

# Now import Channels components
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from game.routing import websocket_urlpatterns

# Get Django ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})