"""
REST endpoints for the guided reconciliation flow (see ai/reconciliation.py).
Admin only: these create transactions and can post a balance adjustment.
"""

from decimal import Decimal, InvalidOperation

from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import Account

from . import reconciliation as rec
from .models import ReconciliationSession

SUPPORTED_FORMATS = ['pdf', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg']


class _AdminView(APIView):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if getattr(request.user, 'role', None) != 'Admin':
            raise PermissionDenied('Only admins can reconcile accounts.')

    def _session(self, pk):
        try:
            return ReconciliationSession.objects.select_related('account').get(pk=pk)
        except ReconciliationSession.DoesNotExist:
            raise NotFound('Reconciliation not found.')

    def _run(self, fn):
        try:
            return fn()
        except rec.ReconciliationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReconcileStartView(_AdminView):
    """POST /api/ai/reconcile/start/  (multipart: file, account_id)"""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        account_id = request.data.get('account_id')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not account_id:
            return Response({'error': 'Choose the account this statement belongs to.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            account = Account.objects.get(pk=account_id)
        except (Account.DoesNotExist, ValueError):
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        if ext not in SUPPORTED_FORMATS:
            return Response({'error': f'Unsupported file type: {ext}. Supported: {", ".join(SUPPORTED_FORMATS)}'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            from .file_parser import BankStatementParser
            parsed = BankStatementParser().parse_file(file, ext)
        except ImportError as e:
            return Response({'error': f'Missing dependency: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': f'Failed to read the statement: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        def go():
            session = rec.start_session(request.user, account, parsed, file.name)
            return Response(rec.serialize_session(session), status=status.HTTP_201_CREATED)
        return self._run(go)


class ReconcileOpenView(_AdminView):
    """GET /api/ai/reconcile/open/?account_id=  -> latest unfinished session, or 204."""

    def get(self, request):
        qs = ReconciliationSession.objects.filter(status='open', user=request.user)
        if request.query_params.get('account_id'):
            qs = qs.filter(account_id=request.query_params['account_id'])
        session = qs.select_related('account').first()
        if not session:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(rec.serialize_session(session))


class ReconcileDetailView(_AdminView):
    """GET /api/ai/reconcile/<id>/"""

    def get(self, request, pk):
        return Response(rec.serialize_session(self._session(pk)))


class ReconcileLineActionView(_AdminView):
    """POST /api/ai/reconcile/<id>/lines/<line_id>/<action>/  action = approve | skip | reopen"""
    parser_classes = [JSONParser]

    def post(self, request, pk, line_id, action):
        session = self._session(pk)

        def go():
            if action == 'approve':
                rec.approve_line(session, line_id, request.data if isinstance(request.data, dict) else {})
            elif action == 'skip':
                rec.skip_line(session, line_id)
            elif action == 'reopen':
                rec.reopen_line(session, line_id)
            else:
                return Response({'error': 'Unknown action.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response(rec.serialize_session(self._session(pk)))
        return self._run(go)


class ReconcileAdjustView(_AdminView):
    """POST /api/ai/reconcile/<id>/adjust/  {confirm: true, expected_difference: "123.45"}"""
    parser_classes = [JSONParser]

    def post(self, request, pk):
        session = self._session(pk)
        if request.data.get('confirm') is not True:
            return Response({'error': 'The adjustment must be explicitly confirmed.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            expected = Decimal(str(request.data.get('expected_difference')))
        except (InvalidOperation, TypeError):
            return Response({'error': 'expected_difference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        def go():
            rec.create_adjustment(session, expected)
            return Response(rec.serialize_session(self._session(pk)))
        return self._run(go)


class ReconcileCompleteView(_AdminView):
    """POST /api/ai/reconcile/<id>/complete/"""

    def post(self, request, pk):
        session = self._session(pk)

        def go():
            rec.complete_session(session)
            return Response(rec.serialize_session(self._session(pk)))
        return self._run(go)
