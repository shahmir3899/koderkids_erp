"""
Custom pagination classes for optimized API responses.
Part of Phase 3 Backend Optimization.
"""
from rest_framework.pagination import PageNumberPagination, CursorPagination


class StandardPagination(PageNumberPagination):
    """
    Standard page number pagination for most list endpoints.
    - Default: 50 items per page
    - Max: 200 items per page
    - Supports page_size query param for client-side control
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

    def get_paginated_response(self, data):
        """Enhanced response with additional metadata."""
        response = super().get_paginated_response(data)
        response.data['page_size'] = self.get_page_size(self.request)
        response.data['total_pages'] = self.page.paginator.num_pages
        response.data['current_page'] = self.page.number
        return response


class SmallPagination(PageNumberPagination):
    """
    Smaller pagination for lightweight endpoints.
    - Default: 20 items per page
    - Max: 100 items per page
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class LargePagination(PageNumberPagination):
    """
    Larger pagination for bulk data endpoints.
    - Default: 100 items per page
    - Max: 500 items per page
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500


class StudentCursorPagination(CursorPagination):
    """
    Cursor pagination for students - more efficient for large datasets.
    Uses created_at as ordering to ensure consistent ordering.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    ordering = '-created_at'


class TransactionCursorPagination(CursorPagination):
    """
    Cursor pagination for transactions.
    Uses date as ordering for chronological consistency.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    ordering = '-date'
