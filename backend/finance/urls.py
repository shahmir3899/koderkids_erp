from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, IncomeViewSet,  LoanViewSet, AccountViewSet, TransferViewSet, account_balances, category_entries, finance_summary, loan_summary, monthly_trends, cash_flow, account_balance_history, expense_categories, income_categories   

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

    # Monthly Trends
    path('dashboard/monthly-trends/', monthly_trends, name='monthly-trends'),
    
    # Cash Flow Analysis
    path('dashboard/cash-flow/', cash_flow, name='cash-flow'),
    
    # Account Balance History
    path('dashboard/account-balance-history/', account_balance_history, name='account-balance-history'),
    
    # Expense Categories Analysis
    path('dashboard/expense-categories/', expense_categories, name='expense-categories'),
    path('dashboard/income-categories/', income_categories, name='income-categories'),
   # path('dashboard/account-balance-history/', account_balance_history, name='account-balance-history'),

]

