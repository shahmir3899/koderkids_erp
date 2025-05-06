from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import LimitOffsetPagination
from .permissions import IsAdminUser
from django.utils.timezone import now
from django.db.models import Sum, Q
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from django.core.cache import cache
from .models import CategoryEntry, Transaction, Loan, Account
from .serializers import CategoryEntrySerializer, TransactionSerializer, LoanSerializer, AccountSerializer


# Custom pagination class for transaction APIs
class StandardResultsSetPagination(LimitOffsetPagination):
    default_limit = 50  # Default to 50 transactions per page
    max_limit = 1000    # Maximum limit to prevent excessive data fetching

# Income ViewSet
class IncomeViewSet(ModelViewSet):
    """Handles all income-related transactions with pagination."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Filter transactions by school and optional query params."""
        school_id = self.request.query_params.get("school", None)
        queryset = Transaction.objects.filter(transaction_type="Income").order_by("-date")
        if school_id and school_id.lower() != "all":
            queryset = queryset.filter(school_id=school_id)
        # Support server-side filtering for Transaction Explorer
        category = self.request.query_params.get("category", None)
        date_gte = self.request.query_params.get("date__gte", None)
        date_lte = self.request.query_params.get("date__lte", None)
        if category:
            queryset = queryset.filter(category=category)
        if date_gte:
            queryset = queryset.filter(date__gte=date_gte)
        if date_lte:
            queryset = queryset.filter(date__lte=date_lte)
        return queryset

# Expense ViewSet
class ExpenseViewSet(ModelViewSet):
    """Handles all expense-related transactions with pagination."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Filter transactions by school and optional query params."""
        school_id = self.request.query_params.get("school", None)
        queryset = Transaction.objects.filter(transaction_type="Expense").order_by("-date")
        if school_id and school_id.lower() != "all":
            queryset = queryset.filter(school_id=school_id)
        # Support server-side filtering
        category = self.request.query_params.get("category", None)
        date_gte = self.request.query_params.get("date__gte", None)
        date_lte = self.request.query_params.get("date__lte", None)
        if category:
            queryset = queryset.filter(category=category)
        if date_gte:
            queryset = queryset.filter(date__gte=date_gte)
        if date_lte:
            queryset = queryset.filter(date__lte=date_lte)
        return queryset

# Transfer ViewSet
class TransferViewSet(ModelViewSet):
    """Handles all money transfers with pagination."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Filter transactions by school and optional query params."""
        school_id = self.request.query_params.get("school", None)
        queryset = Transaction.objects.filter(transaction_type="Transfer").order_by("-date")
        if school_id and school_id.lower() != "all":
            queryset = queryset.filter(school_id=school_id)
        # Support server-side filtering
        category = self.request.query_params.get("category", None)
        date_gte = self.request.query_params.get("date__gte", None)
        date_lte = self.request.query_params.get("date__lte", None)
        if category:
            queryset = queryset.filter(category=category)
        if date_gte:
            queryset = queryset.filter(date__gte=date_gte)
        if date_lte:
            queryset = queryset.filter(date__lte=date_lte)
        return queryset

# Loan ViewSet
class LoanViewSet(ModelViewSet):
    queryset = Loan.objects.all().order_by('-due_date')
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

# Account ViewSet
class AccountViewSet(ModelViewSet):
    queryset = Account.objects.all().order_by('account_name')
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def create(self, request, *args, **kwargs):
        """Ensure new accounts start with zero balance."""
        request.data["current_balance"] = 0
        return super().create(request, *args, **kwargs)

@api_view(["GET"])
def finance_summary(request):
    """Provides a cached summary of income, expenses, loans, and account balances."""
    cache_key = "finance_summary"
    summary = cache.get(cache_key)

    if summary is None:
        # Calculate aggregates if cache miss
        total_income = Transaction.objects.filter(
            transaction_type="Income"
        ).exclude(category="Transfer").aggregate(total=Sum("amount"))["total"] or 0

        total_loans_received = Transaction.objects.filter(
            transaction_type="Income", category="Loan Received"
        ).aggregate(Sum("amount"))["amount__sum"] or 0

        income = total_income - total_loans_received

        expenses = Transaction.objects.filter(
            transaction_type="Expense"
        ).exclude(category="Transfer").aggregate(total=Sum("amount"))["total"] or 0

        total_loans_paid = Transaction.objects.filter(
            transaction_type="Expense", category="Loan Paid"
        ).aggregate(Sum("amount"))["amount__sum"] or 0
        loans = total_loans_received - total_loans_paid

        accounts = Account.objects.values("account_name", "current_balance")

        summary = {
            "income": income,
            "expenses": expenses,
            "loans": loans,
            "accounts": list(accounts),
        }
        # Cache for 5 minutes
        cache.set(cache_key, summary, 300)

    return Response(summary)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def category_entries(request):
    if request.method == 'GET':
        category_type = request.GET.get('type')
        if category_type not in ['income', 'expense']:
            return Response({"error": "Missing or invalid type (income/expense)"}, status=400)

        categories = CategoryEntry.objects.filter(category_type=category_type).order_by('name')
        serializer = CategoryEntrySerializer(categories, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = CategoryEntrySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

@api_view(["GET"])
def account_balances(request):
    """Returns the current balance for all accounts using stored balances."""
    accounts = Account.objects.all()
    serializer = AccountSerializer(accounts, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def loan_summary(request):
    """Fetch cached summarized loan data for all lenders."""
    cache_key = "loan_summary"
    summary_data = cache.get(cache_key)

    if summary_data is None:
        lenders = Transaction.objects.filter(
            transaction_type="Income",
            category="Loan Received"
        ).values_list("from_account_id", flat=True).distinct()

        persons = Account.objects.filter(id__in=lenders)
        summary_data = []

        for person in persons:
            total_received = Transaction.objects.filter(
                transaction_type="Income",
                category="Loan Received",
                from_account_id=person.id
            ).aggregate(Sum("amount"))["amount__sum"] or 0

            total_paid = Transaction.objects.filter(
                transaction_type="Expense",
                category="Loan Paid",
                to_account_id=person.id
            ).aggregate(Sum("amount"))["amount__sum"] or 0

            balance_outstanding = total_received - total_paid

            summary_data.append({
                "person": person.account_name,
                "total_received": total_received,
                "total_paid": total_paid,
                "balance_outstanding": balance_outstanding
            })

        # Cache for 5 minutes
        cache.set(cache_key, summary_data, 300)

    return Response(summary_data)