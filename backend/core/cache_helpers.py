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


def _version(name):
    """Current version number for a cache group (DatabaseCache has no wildcard delete,
    so groups are invalidated by bumping this number, which changes every key in the group)."""
    return cache.get(f'ver_{name}', 1)


def bump_version(name):
    """Invalidate every cached entry in a group at once."""
    cache.set(f'ver_{name}', _version(name) + 1, None)


def get_classes_cached(school_id):
    """
    Distinct class names for a school (same rows as the get_classes view).
    Returns a list; empty list if the school has no students.
    """
    cache_key = f'classes_v{_version("schools")}_{school_id}'
    classes = cache.get(cache_key)

    if classes is None:
        from students.models import Student
        classes = list(
            Student.objects.filter(school_id=school_id)
            .values_list('student_class', flat=True)
            .distinct()
        )
        cache.set(cache_key, classes, CACHE_TIMEOUTS['classes'])

    return classes


def get_user_schools_cached(user):
    """
    Schools (with their classes) visible to a user, for the get_schools view.
    Admins share one entry; teachers get one entry each. Returns None for other roles.
    """
    if user.role == "Admin":
        scope = 'admin'
    elif user.role == "Teacher":
        scope = f'teacher_{user.id}'
    else:
        return None

    cache_key = f'user_schools_v{_version("schools")}_{scope}'
    data = cache.get(cache_key)

    if data is None:
        from collections import defaultdict
        from students.models import School, Student
        schools = School.objects.all() if scope == 'admin' else user.assigned_schools.all()

        classes_by_school = defaultdict(list)
        rows = Student.objects.filter(school__in=schools).values('school_id', 'student_class').distinct()
        for row in rows:
            classes_by_school[row['school_id']].append(row['student_class'])

        data = [
            {"id": s.id, "name": s.name, "classes": classes_by_school.get(s.id, []), "address": s.location}
            for s in schools
        ]
        cache.set(cache_key, data, CACHE_TIMEOUTS['schools_list'])

    return data


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
    bump_version('schools')  # also expires classes_* and user_schools_* entries
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


def cached_api(*groups, timeout=120, per_user=True):
    """
    Cache a GET DRF view's JSON body (works on @api_view functions and APIView.get methods;
    put it under the @api_view/@permission_classes decorators so auth still runs first).

    Key = view + user (unless per_user=False) + query string + version of each group.
    Bump a group with bump_version(name) (signals do this) to expire everything in it early;
    otherwise entries expire after `timeout` seconds. Only 200 responses are cached.
    """
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            request = args[-1] if hasattr(args[-1], 'query_params') else args[0]
            if request.method != 'GET':
                return view(*args, **kwargs)

            import hashlib
            versions = cache.get_many([f'ver_{g}' for g in groups])
            ver = '-'.join(str(versions.get(f'ver_{g}', 1)) for g in groups)
            who = f'u{request.user.id}' if per_user else 'all'
            # URL kwargs (e.g. a book id in /books/<id>/toc/) are part of the key too,
            # otherwise every id would share one cached response.
            params = '&'.join(f'{k}={v}' for k, v in sorted(request.query_params.items()))
            params += '|' + '&'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))
            key =f'api_{view.__qualname__}_{ver}_{who}_{hashlib.md5(params.encode()).hexdigest()[:10]}'

            data = cache.get(key)
            if data is not None:
                from rest_framework.response import Response
                return Response(data)

            response = view(*args, **kwargs)
            if getattr(response, 'status_code', None) == 200:
                # Round-trip through JSON so only plain, picklable data is stored
                # (and dates/decimals look exactly as the client sees them).
                import json
                from rest_framework.renderers import JSONRenderer
                cache.set(key, json.loads(JSONRenderer().render(response.data)), timeout)
            return response
        return wrapper
    return decorator
