from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from .permissions import IsAdminUser
from django.utils.timezone import now
from django.db.models import Sum, Q
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from .models import CategoryEntry, Transaction,  Loan, Account
from .serializers import  CategoryEntrySerializer, TransactionSerializer,  LoanSerializer, AccountSerializer


#Finance View.py
class IncomeViewSet(ModelViewSet):
    """Handles all income-related transactions."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter transactions by school if provided."""
        school_id = self.request.query_params.get("school", None)
        queryset = Transaction.objects.filter(transaction_type="Income").order_by("-date")
        if school_id and school_id.lower() != "all":
            queryset = queryset.filter(school_id=school_id)
        return queryset


class ExpenseViewSet(ModelViewSet):
    """Handles all expense-related transactions."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter transactions by school if provided."""
        school_id = self.request.query_params.get("school", None)
        queryset = Transaction.objects.filter(transaction_type="Expense").order_by("-date")
        if school_id and school_id.lower() != "all":
            queryset = queryset.filter(school_id=school_id)
        return queryset


class TransferViewSet(ModelViewSet):
    """Handles all money transfers (including loan repayments)."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter transactions by school if provided."""
        school_id = self.request.query_params.get("school", None)
        queryset = Transaction.objects.filter(transaction_type="Transfer").order_by("-date")
        if school_id and school_id.lower() != "all":
            queryset = queryset.filter(school_id=school_id)
        return queryset




# ✅ Loan ViewSet
class LoanViewSet(ModelViewSet):
    queryset = Loan.objects.all().order_by('-due_date')
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AccountViewSet(ModelViewSet):
    queryset = Account.objects.all().order_by('account_name')
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def create(self, request, *args, **kwargs):
        """Ensure new accounts start with zero balance."""
        request.data["current_balance"] = 0  # New accounts always start with 0 balance
        return super().create(request, *args, **kwargs)


@api_view(["GET"])
def finance_summary(request):
    """Provides a summary of actual income (excluding loans and transfers), expenses, loans, and account balances."""

    # ✅ Corrected Income Calculation (Excluding Transfers)
    total_income = Transaction.objects.filter(
        transaction_type="Income"
    ).exclude(category="Transfer").aggregate(total=Sum("amount"))["total"] or 0

    # ✅ Corrected Loan Received (Still Excluded as Before)
    total_loans_received = Transaction.objects.filter(
        transaction_type="Income", category="Loan Received"
    ).aggregate(Sum("amount"))["amount__sum"] or 0

    # ✅ Actual Income (excluding loans and transfers)
    income = total_income - total_loans_received

    # ✅ Corrected Expense Calculation (Excluding Transfers)
    expenses = Transaction.objects.filter(
        transaction_type="Expense"
    ).exclude(category="Transfer").aggregate(total=Sum("amount"))["total"] or 0

    # ✅ Correct Loan Paid Logic
    total_loans_paid = Transaction.objects.filter(
        transaction_type="Expense", category="Loan Paid"
    ).aggregate(Sum("amount"))["amount__sum"] or 0
    loans = total_loans_received - total_loans_paid  # Outstanding loan balance

    # ✅ Updated Account Balances (No change needed here)
    accounts = Account.objects.values("account_name", "current_balance")

    return Response({
        "income": income,
        "expenses": expenses,
        "loans": loans,
        "accounts": list(accounts),
    })


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
    """Returns the current balance for all accounts."""
    accounts = Account.objects.all()

    for account in accounts:
        # Recalculate balance to exclude Transfer-related errors
        account.update_balance()

    serializer = AccountSerializer(accounts, many=True)
    return Response(serializer.data)



@api_view(['GET'])
def loan_summary(request):
    """
    Fetch summarized loan data for all lenders (who provided loans).
    """
    # Get all unique lenders (accounts that provided loans)
    lenders = Transaction.objects.filter(
        transaction_type="Income",
        category="Loan Received"
    ).values_list("from_account_id", flat=True).distinct()

    persons = Account.objects.filter(id__in=lenders)  # Fetch lender details

    summary_data = []

    for person in persons:
        # Total Loan Received (unchanged, works correctly)
        total_received = Transaction.objects.filter(
            transaction_type="Income",
            category="Loan Received",
            from_account_id=person.id
        ).aggregate(Sum("amount"))["amount__sum"] or 0

        # Total Loan Repaid (updated to match "Loan Paid" with Expense type)
        total_paid = Transaction.objects.filter(
            transaction_type="Expense",  # Changed from "Payment"
            category="Loan Paid",       # Changed from "Loan"
            to_account_id=person.id     # Lender as to_account
        ).aggregate(Sum("amount"))["amount__sum"] or 0

        balance_outstanding = total_received - total_paid

        summary_data.append({
            "person": person.account_name,
            "total_received": total_received,
            "total_paid": total_paid,
            "balance_outstanding": balance_outstanding
        })

    return Response(summary_data)


