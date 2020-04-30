from django.shortcuts import render, get_object_or_404
from .models import Channel
from rest_framework import status, filters, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from accounts.models import User
from accounts.serializers import UserDisplaySerializer
from .serializers import UserChannelSerializer, ChannelSerializer
from django.http import JsonResponse
from posts.models import Post
from posts.serializers import PostSerializer

# Create your views here.

# 채널 목록
@api_view(['GET', 'POST'])
@permission_classes((IsAuthenticated, ))
def board(request):
    if request.method == 'GET':  # list of diary books
        user = get_object_or_404(User, username=request.user)
        serializer = UserChannelSerializer(user)
        return JsonResponse(serializer.data)
    elif request.method == 'POST':  # create a diary book
        data = request.data
        data.update({'create_user': request.user.id})
        serializer = ChannelSerializer(data=data)
        if serializer.is_valid():
            print('valid')
            serializer.save()
            user = get_object_or_404(User, username=request.user)
            channel = Channel.objects.last()
            user.channels.add(channel)
            return JsonResponse({'message': 'success to save'}, status=201)
        else:
            return JsonResponse({'message': serializer.errors }, status=400)

# 채널 한 개
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes((IsAuthenticated, ))
def board_title(request, id):
    channel = get_object_or_404(Channel, id=id)
    if channel.user_set.filter(id=request.user.id).exists():
        if request.method == 'GET':  # diary book detail
            serializer = ChannelSerializer(channel)
            return JsonResponse(serializer.data)
    else:
        return JsonResponse({'message': 'INVALID USER'}, status=400)

    if channel.create_user_id == request.user.id:
        if request.method == 'PUT':  # update a diary book
            data = request.data
            data.update({'create_user': request.user.id})
            serializer = ChannelSerializer(channel, data=data)
            if serializer.is_valid():
                serializer.save()
                return JsonResponse({'message': 'success to update'}, status=201)
            else:
                return JsonResponse({'message': 'fail to update'}, status=400)

        elif request.method == 'DELETE':  # delete a diary book
            channel.delete()
            return JsonResponse({'message': 'success to delete'}, status=200)
    else:
        return JsonResponse({'message': 'INVALID USER'}, status=400)

# 채널 입장 및 탈퇴
@api_view(['POST', 'DELETE'])
@permission_classes((IsAuthenticated, ))
def board_join(request, id):
    if request.method == 'POST':  # join a channel
        user = get_object_or_404(User, username=request.user)
        channel = get_object_or_404(Channel, id=id)
        user.channels.add(channel)

        return JsonResponse({'message': 'success to join'}, status=201)

    elif request.method == 'DELETE':  # leave from a channel
        user = request.user
        channel = get_object_or_404(Channel, id=id)
        if channel.user_set.filter(id=user.id).exists():
            print(type(channel.user_set))
            channel.user_set.remove(user)
            return JsonResponse({'message': 'success to leave'}, status=200)
        else:
            return JsonResponse({'message': 'fail to leave'}, status=200)

class SearchTags(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated, )
    serializer_class = PostSerializer   
    search_fields = ['tags__name']
    filter_backends = (filters.SearchFilter, )

    def get_queryset(self):
        queryset = Post.objects.filter(channel_id=self.kwargs['id'])
        return queryset