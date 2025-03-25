from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, IncomeViewSet,  LoanViewSet, AccountViewSet, TransferViewSet, account_balances, category_entries, finance_summary, loan_summary

router = DefaultRouter()
router.register(r'income', IncomeViewSet, basename='income')
router.register(r'expense', ExpenseViewSet, basename='expense')
router.register(r'transfers', TransferViewSet, basename='transfers')

router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'accounts', AccountViewSet, basename='account')




urlpatterns = [
    path('', include(router.urls)),  # ✅ Includes all finance APIs
    path('loan-summary/', loan_summary, name='loan-summary'),
    path('account-balances/', account_balances, name='account-balances'),
    path('finance-summary/', finance_summary, name='finance-summary'),
    path('categories/', category_entries, name='category-entries'),
    
]

