from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ExpenseViewSet, IncomeViewSet, LoanViewSet, AccountViewSet, TransferViewSet,
    UnifiedTransactionViewSet,
    account_balances, category_entries, finance_summary, loan_summary,
    monthly_trends, cash_flow, account_balance_history, expense_categories, income_categories
)

router = DefaultRouter()
router.register(r'income', IncomeViewSet, basename='income')
router.register(r'expense', ExpenseViewSet, basename='expense')
router.register(r'transfers', TransferViewSet, basename='transfers')

router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'accounts', AccountViewSet, basename='account')


# Unified transaction viewset patterns (alternative API)
unified_transaction_list = UnifiedTransactionViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
unified_transaction_detail = UnifiedTransactionViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})
unified_transaction_bulk = UnifiedTransactionViewSet.as_view({
    'post': 'bulk_create',
})


urlpatterns = [
    path('', include(router.urls)),  # Existing separate ViewSets

    # Unified Transaction API (new alternative endpoints)
    path('transactions/<str:transaction_type>/', unified_transaction_list, name='unified-transaction-list'),
    path('transactions/<str:transaction_type>/<int:pk>/', unified_transaction_detail, name='unified-transaction-detail'),
    path('transactions/<str:transaction_type>/bulk/', unified_transaction_bulk, name='unified-transaction-bulk'),

    # Summary endpoints
    path('loan-summary/', loan_summary, name='loan-summary'),
    path('account-balances/', account_balances, name='account-balances'),
    path('finance-summary/', finance_summary, name='finance-summary'),
    path('categories/', category_entries, name='category-entries'),

    # Dashboard endpoints
    path('dashboard/monthly-trends/', monthly_trends, name='monthly-trends'),
    path('dashboard/cash-flow/', cash_flow, name='cash-flow'),
    path('dashboard/account-balance-history/', account_balance_history, name='account-balance-history'),
    path('dashboard/expense-categories/', expense_categories, name='expense-categories'),
    path('dashboard/income-categories/', income_categories, name='income-categories'),
]

