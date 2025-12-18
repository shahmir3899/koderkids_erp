from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import LimitOffsetPagination
from .permissions import IsAdminUser
from django.utils.timezone import now
from django.db.models import Sum, Q, Count
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from django.core.cache import cache
from .models import CategoryEntry, Transaction, Loan, Account
from .serializers import CategoryEntrySerializer, TransactionSerializer, LoanSerializer, AccountSerializer
from dateutil.relativedelta import relativedelta
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Transaction, Account
from students.models import School


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





# ============================================
# 1. MONTHLY TRENDS
# ============================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_trends(request):
    """
    Get monthly trends for income vs expenses.
    Query params:
    - period: '3months', '6months', or 'custom' (default: '6months')
    - start_date: YYYY-MM-DD (required if period='custom')
    - end_date: YYYY-MM-DD (required if period='custom')
    - school: school_id (optional filter)
    """
    period = request.GET.get('period', '6months')
    school_id = request.GET.get('school')
    end_date = datetime.now().date()  # Use current date; in production, this would be Dec 15, 2025, if mocked

    # Determine date range and months_back
    if period == '3months':
        months_back = 3
    elif period == '6months':
        months_back = 6
    elif period == 'custom':
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        if not start_date_str or not end_date_str:
            return Response({'error': 'start_date and end_date are required for custom period'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            if start_date > end_date:
                return Response({'error': 'start_date must be before end_date'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Invalid period. Use 3months, 6months, or custom'}, status=status.HTTP_400_BAD_REQUEST)

    # For non-custom periods, calculate start_date (first day of the month N months back)
    if period != 'custom':
        start_date = (end_date - relativedelta(months=months_back - 1)).replace(day=1)

    # Generate complete list of months in the range (starting from the first of each month)
    current = start_date.replace(day=1)
    months = []
    while current <= end_date:
        months.append(current)
        current += relativedelta(months=1)

    # Base queryset for transactions in the date range
    transactions_qs = Transaction.objects.filter(date__gte=start_date, date__lte=end_date)
    if school_id:
        transactions_qs = transactions_qs.filter(school_id=school_id)

    # Aggregate by month: gross income/expenses, loan received/paid
    aggregated = transactions_qs.annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        gross_income=Sum('amount', filter=Q(transaction_type='Income')),
        gross_expenses=Sum('amount', filter=Q(transaction_type='Expense')),
        loan_received=Sum('amount', filter=Q(transaction_type='Income', category='Loan Received')),
        loan_paid=Sum('amount', filter=Q(transaction_type='Expense', category='Loan Paid')),
    ).order_by('month')

    # Create a lookup dict for aggregated data
    data_map = {entry['month']: entry for entry in aggregated}

    # Build complete dataset with defaults and operational adjustments
    data = []
    total_operational_income = 0
    total_operational_expenses = 0
    total_net = 0
    best_month = None
    for month_date in months:
        entry = data_map.get(month_date, {
            'gross_income': 0,
            'gross_expenses': 0,
            'loan_received': 0,
            'loan_paid': 0,
        })
        gross_income = entry['gross_income'] or 0
        gross_expenses = entry['gross_expenses'] or 0
        loan_received = entry['loan_received'] or 0
        loan_paid = entry['loan_paid'] or 0

        # Operational adjustments to match finance_summary logic
        operational_income = gross_income - loan_received
        operational_expenses = gross_expenses - loan_paid
        net = operational_income - operational_expenses

        month_entry = {
            'month_label': month_date.strftime('%b %Y'),
            'income': float(operational_income),
            'expenses': float(operational_expenses),
            'net': float(net),
        }
        data.append(month_entry)

        # Accumulate totals
        total_operational_income += operational_income
        total_operational_expenses += operational_expenses
        total_net += net

        # Track best month (highest net)
        if best_month is None or net > best_month['net']:
            best_month = {
                'label': month_entry['month_label'],
                'net': float(net),
            }

    # Calculate averages (over number of months in range, including zeros)
    num_months = len(months)
    avg_monthly_income = total_operational_income / num_months if num_months > 0 else 0
    avg_monthly_expense = total_operational_expenses / num_months if num_months > 0 else 0

    # Response structure matching frontend expectations
    return Response({
        'data': data,
        'summary': {
            'avg_monthly_income': float(avg_monthly_income),
            'avg_monthly_expense': float(avg_monthly_expense),
            'total_net': float(total_net),
            'best_month': best_month if best_month else None,  # None if no data
        }
    })# 2. CASH FLOW ANALYSIS

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def income_categories(request):
    """
    Get income breakdown by category.
    Query params:
    - period: '3months', '6months', or 'custom' (default: '6months')
    - start_date: YYYY-MM-DD (required if period='custom')
    - end_date: YYYY-MM-DD (required if period='custom')
    - category: specific category or 'all' (default: all)
    - school: school_id (optional filter)
    """
    period = request.GET.get('period', '6months')
    category_filter = request.GET.get('category', 'all')
    school_id = request.GET.get('school')
    
    # Determine date range
    end_date = datetime.now().date()  # Current date: December 15, 2025
    
    if period == '3months':
        start_date = end_date - timedelta(days=90)
    elif period == '6months':
        start_date = end_date - timedelta(days=180)
    elif period == 'custom':
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response({
                'error': 'start_date and end_date are required for custom period'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            if start_date > end_date:
                return Response({'error': 'start_date must be before end_date'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Invalid period. Use 3months, 6months, or custom'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Base queryset
    income_qs = Transaction.objects.filter(
        transaction_type='Income',
        date__gte=start_date,
        date__lte=end_date
    )
    
    # Apply filters
    if school_id:
        income_qs = income_qs.filter(school_id=school_id)
    
    if category_filter != 'all':
        income_qs = income_qs.filter(category=category_filter)
    
    # Group by category
    categories = income_qs.values('category').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')
    
    # Calculate total for percentage
    total_income = income_qs.aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Format data
    data = []
    for cat in categories:
        percentage = (float(cat['total']) / float(total_income) * 100) if total_income > 0 else 0
        data.append({
            'category': cat['category'],
            'total': float(cat['total']),
            'count': cat['count'],
            'percentage': round(percentage, 2),
        })
    
    # Get list of all available categories for Income
    all_categories = Transaction.objects.filter(
        transaction_type='Income'
    ).values_list('category', flat=True).distinct()
    
    return Response({
        'data': data,
        'summary': {
            'total_income': float(total_income),
            'category_count': len(data),
            'avg_per_category': float(total_income) / len(data) if data else 0,
        },
        'period': {
            'type': period,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'available_categories': list(all_categories),
        'selected_category': category_filter,
    })
# ============================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cash_flow(request):
    """
    Get cash flow analysis showing money in/out by month
    Query params:
    - months: number of months (default: 6)
    - school: school_id (optional filter)
    """
    months = int(request.GET.get('months', 6))
    school_id = request.GET.get('school')
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months*30)
    
    # Get transactions
    income_qs = Transaction.objects.filter(
        transaction_type='Income',
        date__gte=start_date,
        date__lte=end_date
    )
    expense_qs = Transaction.objects.filter(
        transaction_type='Expense',
        date__gte=start_date,
        date__lte=end_date
    )
    transfer_qs = Transaction.objects.filter(
        transaction_type='Transfer',
        date__gte=start_date,
        date__lte=end_date
    )
    
    # Apply school filter
    if school_id:
        income_qs = income_qs.filter(school_id=school_id)
        expense_qs = expense_qs.filter(school_id=school_id)
        transfer_qs = transfer_qs.filter(school_id=school_id)
    
    # Group by month
    income_by_month = income_qs.annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        total=Sum('amount')
    ).order_by('month')
    
    expense_by_month = expense_qs.annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        total=Sum('amount')
    ).order_by('month')
    
    # Convert to dict
    income_dict = {item['month'].strftime('%Y-%m'): float(item['total']) for item in income_by_month}
    expense_dict = {item['month'].strftime('%Y-%m'): float(item['total']) for item in expense_by_month}
    
    # Calculate cumulative balance
    data = []
    cumulative_balance = 0
    
    current = start_date.replace(day=1)
    end = end_date.replace(day=1)
    
    while current <= end:
        month_key = current.strftime('%Y-%m')
        month_label = current.strftime('%b %Y')
        
        inflow = income_dict.get(month_key, 0)
        outflow = expense_dict.get(month_key, 0)
        net_flow = inflow - outflow
        
        opening_balance = cumulative_balance
        cumulative_balance += net_flow
        closing_balance = cumulative_balance
        
        data.append({
            'month': month_key,
            'month_label': month_label,
            'opening_balance': opening_balance,
            'inflow': inflow,
            'outflow': outflow,
            'net_flow': net_flow,
            'closing_balance': closing_balance,
        })
        
        # Next month
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    
    # Calculate totals and averages
    total_inflow = sum(item['inflow'] for item in data)
    total_outflow = sum(item['outflow'] for item in data)
    avg_monthly_inflow = total_inflow / len(data) if data else 0
    avg_monthly_outflow = total_outflow / len(data) if data else 0
    
    # Get current cash position (sum of all account balances)
    total_cash = Account.objects.aggregate(
        total=Sum('current_balance')
    )['total'] or 0
    
    return Response({
        'data': data,
        'summary': {
            'total_inflow': total_inflow,
            'total_outflow': total_outflow,
            'net_cash_flow': total_inflow - total_outflow,
            'avg_monthly_inflow': avg_monthly_inflow,
            'avg_monthly_outflow': avg_monthly_outflow,
            'current_cash_position': float(total_cash),
            'burn_rate': avg_monthly_outflow,
        }
    })


# ============================================
# 3. ACCOUNT BALANCE HISTORY
# ============================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_balance_history(request):
    """
    Get balance history for a specific account over time.
    
    Query params:
    - account_name: Required - Name of the account
    - timeframe: 'monthly' or 'weekly' (default: monthly)
    - months: Number of months to look back (default: 6)
    
    Returns:
    {
        "account": {
            "name": "Bank Islami",
            "type": "Bank",
            "current_balance": 450000
        },
        "data": [
            {
                "date": "2025-01-31",
                "label": "Jan 2025",
                "balance": 400000
            },
            ...
        ],
        "statistics": {
            "balance_change": 50000,
            "percentage_change": 12.5,
            "data_points": 6
        },
        "timeframe": "monthly"
    }
    """
    
    account_name = request.GET.get('account_name')
    
    if not account_name:
        return Response({
            'error': 'account_name parameter is required'
        }, status=400)
    
    # Get the account
    try:
        account = Account.objects.get(account_name=account_name)
    except Account.DoesNotExist:
        return Response({
            'error': f'Account "{account_name}" not found'
        }, status=404)
    
    timeframe = request.GET.get('timeframe', 'monthly')
    months = int(request.GET.get('months', 6))
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months*30)
    
    print(f"Fetching transactions for account: {account_name}")
    print(f"Date range: {start_date.date()} to {end_date.date()}")
    
    # Get all transactions for this account (where it's sender OR receiver)
    transactions = Transaction.objects.filter(
        Q(from_account=account) | Q(to_account=account),
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')
    
    print(f"Found {transactions.count()} transactions")
    
    if transactions.count() == 0:
        return Response({
            'account': {
                'name': account.account_name,
                'type': account.account_type,
                'current_balance': float(account.current_balance),
            },
            'data': [],
            'statistics': {
                'balance_change': 0,
                'percentage_change': 0,
                'data_points': 0,
            },
            'timeframe': timeframe,
        })
    
    # Calculate running balance
    balance_history = []
    running_balance = Decimal('0.00')
    
    for tx in transactions:
        amount = tx.amount
        
        # Determine if this is credit or debit for this account
        if tx.to_account == account:
            # Money coming IN to this account
            running_balance += amount
        elif tx.from_account == account:
            # Money going OUT from this account
            running_balance -= amount
        
        balance_history.append({
            'date': tx.date,
            'balance': float(running_balance),
            'amount': float(amount),
            'type': tx.transaction_type,
        })
    
    print(f"Calculated {len(balance_history)} balance points")
    
    # Adjust balances to match current balance
    if balance_history:
        last_calculated = Decimal(str(balance_history[-1]['balance']))
        current_actual = account.current_balance
        adjustment = current_actual - last_calculated
        
        print(f"Last calculated balance: {last_calculated}")
        print(f"Current actual balance: {current_actual}")
        print(f"Adjustment needed: {adjustment}")
        
        for item in balance_history:
            item['balance'] = float(Decimal(str(item['balance'])) + adjustment)
    
    # Group by timeframe
    if timeframe == 'monthly':
        grouped_data = group_by_month(balance_history)
    elif timeframe == 'weekly':
        grouped_data = group_by_week(balance_history)
    else:
        return Response({
            'error': 'Invalid timeframe. Use "monthly" or "weekly"'
        }, status=400)
    
    # Calculate statistics
    if len(grouped_data) >= 2:
        first_balance = grouped_data[0]['balance']
        last_balance = grouped_data[-1]['balance']
        balance_change = last_balance - first_balance
        percentage_change = (balance_change / abs(first_balance) * 100) if first_balance != 0 else 0
    else:
        balance_change = 0
        percentage_change = 0
    
    print(f"Returning {len(grouped_data)} data points")
    
    return Response({
        'account': {
            'name': account.account_name,
            'type': account.account_type,
            'current_balance': float(account.current_balance),
        },
        'data': grouped_data,
        'statistics': {
            'balance_change': balance_change,
            'percentage_change': percentage_change,
            'data_points': len(grouped_data),
        },
        'timeframe': timeframe,
    })


def group_by_month(transactions):
    """Group transactions by month, keeping the last balance of each month."""
    grouped = {}
    
    for tx in transactions:
        date = tx['date']
        month_key = date.strftime('%Y-%m')
        month_label = date.strftime('%b %Y')
        
        # Keep the latest transaction in each month
        if month_key not in grouped or date > grouped[month_key]['date']:
            grouped[month_key] = {
                'date': date,
                'label': month_label,
                'balance': tx['balance'],
            }
    
    # Sort by date and format for response
    result = []
    for month_key in sorted(grouped.keys()):
        item = grouped[month_key]
        result.append({
            'date': item['date'].strftime('%Y-%m-%d'),
            'label': item['label'],
            'balance': item['balance'],
        })
    
    return result


def group_by_week(transactions):
    """Group transactions by week, keeping the last balance of each week."""
    grouped = {}
    
    for tx in transactions:
        date = tx['date']
        # Get Monday of the week
        week_start = date - timedelta(days=date.weekday())
        week_key = week_start.strftime('%Y-%m-%d')
        week_label = week_start.strftime('%b %d')
        
        # Keep the latest transaction in each week
        if week_key not in grouped or date > grouped[week_key]['date']:
            grouped[week_key] = {
                'date': date,
                'label': week_label,
                'balance': tx['balance'],
            }
    
    # Sort by date and format for response
    result = []
    for week_key in sorted(grouped.keys()):
        item = grouped[week_key]
        result.append({
            'date': item['date'].strftime('%Y-%m-%d'),
            'label': item['label'],
            'balance': item['balance'],
        })
    
    return result













# ============================================
# 4. EXPENSE CATEGORIES ANALYSIS
# ============================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expense_categories(request):
    """
    Get expense breakdown by category
    Query params:
    - period: '3months', '6months', or 'custom'
    - start_date: YYYY-MM-DD (required if period='custom')
    - end_date: YYYY-MM-DD (required if period='custom')
    - category: specific category or 'all' (default: all)
    - school: school_id (optional filter)
    """
    period = request.GET.get('period', '6months')
    category_filter = request.GET.get('category', 'all')
    school_id = request.GET.get('school')
    
    # Determine date range
    end_date = datetime.now()
    
    if period == '3months':
        start_date = end_date - timedelta(days=90)
    elif period == '6months':
        start_date = end_date - timedelta(days=180)
    elif period == 'custom':
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response({
                'error': 'start_date and end_date are required for custom period'
            }, status=400)
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=400)
    else:
        return Response({'error': 'Invalid period. Use 3months, 6months, or custom'}, status=400)
    
    # Base queryset
    expense_qs = Transaction.objects.filter(
        transaction_type='Expense',
        date__gte=start_date,
        date__lte=end_date
    )
    
    # Apply filters
    if school_id:
        expense_qs = expense_qs.filter(school_id=school_id)
    
    if category_filter != 'all':
        expense_qs = expense_qs.filter(category=category_filter)
    
    # Group by category
    categories = expense_qs.values('category').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')
    
    # Calculate total for percentage
    total_expenses = expense_qs.aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Format data
    data = []
    for cat in categories:
        percentage = (float(cat['total']) / float(total_expenses) * 100) if total_expenses > 0 else 0
        data.append({
            'category': cat['category'],
            'total': float(cat['total']),
            'count': cat['count'],
            'percentage': round(percentage, 2),
        })
    
    # Get list of all available categories
    all_categories = Transaction.objects.filter(
        transaction_type='Expense'
    ).values_list('category', flat=True).distinct()
    
    return Response({
        'data': data,
        'summary': {
            'total_expenses': float(total_expenses),
            'category_count': len(data),
            'avg_per_category': float(total_expenses) / len(data) if data else 0,
        },
        'period': {
            'type': period,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'available_categories': list(all_categories),
        'selected_category': category_filter,
    })