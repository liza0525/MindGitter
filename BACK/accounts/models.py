from django.db import models
from django.contrib.auth.models import AbstractUser
from channels.models import Channel
from posts.models import Emotion
from taggit.managers import TaggableManager
from taggit.models import TaggedItemBase



# Create your models here.
class User(AbstractUser):
    channels = models.ManyToManyField(Channel, blank=True)
    tags = TaggableManager(through='UserTag', blank=True, related_name='tags')
    emotions = models.ManyToManyField(Emotion, through='UserEmotion')
    
    profile_img = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-pk']
    
    def __str__(self):
        return self.username


class UserTag(TaggedItemBase):
    content_object = models.ForeignKey('User', on_delete=models.CASCADE) # user
    count = models.IntegerField(default=1)


class UserEmotion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emotion = models.ForeignKey(Emotion, on_delete=models.CASCADE)
    count = models.IntegerField()



class Notification(models.Model):
    TYPE_CHOICES = (
        ('join', 'Join'),
    )

    inviter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inviter')
    guest = models.ForeignKey(User, on_delete=models.CASCADE, related_name='guest')
    notice_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    accept_or_not = models.CharField(max_length=2) # "1" = accept, "0" = refuse
    