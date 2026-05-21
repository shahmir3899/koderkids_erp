from django.urls import path
from . import views

urlpatterns = [
    path('sessions/', views.session_list_create, name='oc-session-list-create'),
    path('sessions/bulk/', views.session_bulk_create, name='oc-session-bulk-create'),
    path('sessions/<int:session_id>/', views.session_detail, name='oc-session-detail'),
    path('sessions/<int:session_id>/delete-past/', views.session_delete_past, name='oc-session-delete-past'),
    path('sessions/<int:session_id>/token/', views.session_token, name='oc-session-token'),
    path('sessions/<int:session_id>/start/', views.session_start, name='oc-session-start'),
    path('sessions/<int:session_id>/end/', views.session_end, name='oc-session-end'),
    path('sessions/<int:session_id>/participants/', views.session_participants, name='oc-session-participants'),
    path('recordings/', views.recording_list, name='oc-recording-list'),
    path('webhook/', views.livekit_webhook, name='oc-webhook'),
    path('eligible-students/', views.eligible_students, name='oc-eligible-students'),
]
