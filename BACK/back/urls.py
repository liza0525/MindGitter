from django.contrib import admin
from django.urls import path, include
from rest_framework_jwt.views import obtain_jwt_token, refresh_jwt_token
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('accounts.urls')),
    path("api-auth/", include("rest_framework.urls")),
    path("rest-auth/", include("rest_auth.urls")),
    path("rest-auth/registration/", include("rest_auth.registration.urls")),
    path('rest-auth/obtain_token/', obtain_jwt_token, name="obtain-jwt"),
    path('rest-auth/refresh_token/', refresh_jwt_token, name="refresh-jwt"),
    path('channels/', include('channels.urls')),
    path('posts/', include('posts.urls')),
] 

urlpatterns = [
    path('api/', include(urlpatterns))
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
