from django.db import models
from django.contrib.auth.models import AbstractUser
from channels.models import Channel
from posts.models import Emotion
from taggit.managers import TaggableManager
from taggit.models import TaggedItemBase


# Create your models here.
class User(AbstractUser):
    channels = models.ManyToManyField(Channel, blank=True)
    # tags = models.ManyToManyField(Tag, blank=True)
    tags = TaggableManager(through='UserTag', blank=True)
    emotions = models.ManyToManyField(Emotion, through='UserEmotion')
    
    profile_img = models.ImageField(upload_to='user', blank=True)

    class Meta:
        ordering = ['-pk']
    
    def __str__(self):
        return self.username


class UserTag(TaggedItemBase):
    user = models.ForeignKey('User', on_delete=models.CASCADE)


class UserEmotion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emotion = models.ForeignKey(Emotion, on_delete=models.CASCADE)
    count = models.IntegerField()