"""
Cache helper utilities for Phase 3 optimization.
Provides consistent caching patterns across the application.
"""
from django.core.cache import cache
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Cache timeouts (in seconds)
CACHE_TIMEOUTS = {
    'schools_list': 600,       # 10 minutes (rarely changes)
    'categories': 1800,        # 30 minutes (rarely changes)
    'classes': 600,            # 10 minutes
    'user_permissions': 300,   # 5 minutes
    'dashboard_stats': 120,    # 2 minutes (changes frequently)
    'finance_summary': 300,    # 5 minutes
    'reference_data': 600,     # 10 minutes (schools, accounts, etc.)
}


def get_schools_cached():
    """
    Get all schools from cache or database.
    Returns list of school dicts with id, name, location.
    """
    cache_key = 'schools_list_all'
    schools = cache.get(cache_key)

    if schools is None:
        from students.models import School
        schools = list(
            School.objects.filter(is_active=True)
            .values('id', 'name', 'location', 'payment_mode')
            .order_by('name')
        )
        cache.set(cache_key, schools, CACHE_TIMEOUTS['schools_list'])
        logger.debug(f"Schools list cached: {len(schools)} schools")

    return schools


def get_categories_cached(category_type=None):
    """
    Get categories from cache or database.
    Args:
        category_type: 'income' or 'expense' (optional)
    Returns list of category dicts.
    """
    cache_key = f'categories_{category_type or "all"}'
    categories = cache.get(cache_key)

    if categories is None:
        from finance.models import CategoryEntry
        queryset = CategoryEntry.objects.all()
        if category_type:
            queryset = queryset.filter(category_type=category_type)

        categories = list(queryset.values('id', 'name', 'category_type').order_by('name'))
        cache.set(cache_key, categories, CACHE_TIMEOUTS['categories'])
        logger.debug(f"Categories cached: {len(categories)} categories")

    return categories


def get_classes_cached(school_id=None):
    """
    Get unique class names from cache or database.
    Args:
        school_id: Optional filter by school
    Returns list of class names.
    """
    cache_key = f'classes_{school_id or "all"}'
    classes = cache.get(cache_key)

    if classes is None:
        from students.models import Student
        queryset = Student.objects.filter(status='Active')
        if school_id:
            queryset = queryset.filter(school_id=school_id)

        classes = list(
            queryset.values_list('student_class', flat=True)
            .distinct()
            .order_by('student_class')
        )
        cache.set(cache_key, classes, CACHE_TIMEOUTS['classes'])
        logger.debug(f"Classes cached: {len(classes)} classes")

    return classes


def get_accounts_cached():
    """
    Get all accounts from cache or database.
    Returns list of account dicts.
    """
    cache_key = 'accounts_list_all'
    accounts = cache.get(cache_key)

    if accounts is None:
        from finance.models import Account
        accounts = list(
            Account.objects.all()
            .values('id', 'account_name', 'account_type', 'current_balance')
            .order_by('account_name')
        )
        # Convert Decimal to float for JSON serialization
        for acc in accounts:
            acc['current_balance'] = float(acc['current_balance'])

        cache.set(cache_key, accounts, CACHE_TIMEOUTS['reference_data'])
        logger.debug(f"Accounts cached: {len(accounts)} accounts")

    return accounts


def invalidate_school_cache():
    """Invalidate all school-related caches."""
    cache.delete('schools_list_all')
    cache.delete_pattern('classes_*') if hasattr(cache, 'delete_pattern') else None
    cache.delete('transactions_page_reference_data')
    logger.debug("School cache invalidated")


def invalidate_category_cache():
    """Invalidate all category-related caches."""
    cache.delete('categories_all')
    cache.delete('categories_income')
    cache.delete('categories_expense')
    cache.delete('transactions_page_reference_data')
    logger.debug("Category cache invalidated")


def invalidate_account_cache():
    """Invalidate all account-related caches."""
    cache.delete('accounts_list_all')
    cache.delete('transactions_page_reference_data')
    cache.delete('finance_summary')
    cache.delete('loan_summary')
    logger.debug("Account cache invalidated")


def invalidate_finance_cache():
    """Invalidate all finance-related caches."""
    cache.delete('finance_summary')
    cache.delete('loan_summary')
    # Also invalidate dashboard caches
    cache.delete_pattern('admin_dashboard_summary_*') if hasattr(cache, 'delete_pattern') else None
    cache.delete_pattern('finance_dashboard_*') if hasattr(cache, 'delete_pattern') else None
    logger.debug("Finance cache invalidated")


def cached_view(cache_key_func, timeout=300):
    """
    Decorator for caching view responses.

    Usage:
        @cached_view(lambda request: f"my_view_{request.GET.get('school')}", timeout=300)
        def my_view(request):
            ...

    Args:
        cache_key_func: Function that takes request and returns cache key
        timeout: Cache timeout in seconds
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            cache_key = cache_key_func(request)
            cached_response = cache.get(cache_key)

            if cached_response is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_response

            response = view_func(request, *args, **kwargs)

            # Only cache successful responses
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                cache.set(cache_key, response, timeout)
                logger.debug(f"Cache set: {cache_key}")

            return response
        return wrapper
    return decorator
