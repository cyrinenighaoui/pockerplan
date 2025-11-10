from django.shortcuts import render

# Create your views here.
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer

@api_view(['POST'])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": serializer.data,
            "token": str(refresh.access_token)
        })
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": {
                "username": user.username,
                "email": user.email,
            },
            "token": str(refresh.access_token)
        })

    return Response({"error": "Invalid credentials"}, status=401)
