from django.urls import path, include
from rest_framework.routers import DefaultRouter
from finance.views import TransactionViewSet

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    path('api/finance/', include(router.urls)),
]
