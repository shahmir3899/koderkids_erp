"""
AI Action Executor
==================
Executes AI agent actions by calling existing API endpoints/handlers.
"""

import json
from typing import Dict, Any, Optional
from decimal import Decimal

from django.urls import resolve, Resolver404
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request


class ActionExecutor:
    """
    Executes actions determined by the AI agent.
    Reuses existing API logic for consistency.
    """

    def __init__(self, user):
        self.user = user
        self.factory = APIRequestFactory()

    def _make_request(self, method: str, url: str, data: Dict = None) -> Any:
        """Create an authenticated request."""
        from rest_framework.test import force_authenticate

        if method.lower() == 'post':
            request = self.factory.post(url, data=data or {}, format='json')
        elif method.lower() == 'get':
            request = self.factory.get(url, data=data or {})
        elif method.lower() == 'put':
            request = self.factory.put(url, data=data or {}, format='json')
        elif method.lower() == 'patch':
            request = self.factory.patch(url, data=data or {}, format='json')
        elif method.lower() == 'delete':
            request = self.factory.delete(url)
        else:
            raise ValueError(f"Unknown HTTP method: {method}")

        force_authenticate(request, user=self.user)
        return request

    def execute(self, agent: str, action_def, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an action.

        Args:
            agent: Agent name
            action_def: ActionDefinition object
            params: Action parameters

        Returns:
            {"success": bool, "message": str, "data": dict, "error": str}
        """
        action_name = action_def.name

        # Route to appropriate executor
        executors = {
            # Fee actions
            'CREATE_MONTHLY_FEES': self._execute_create_monthly_fees,
            'CREATE_FEES_ALL_SCHOOLS': self._execute_create_fees_all_schools,
            'CREATE_SINGLE_FEE': self._execute_create_single_fee,
            'UPDATE_FEE': self._execute_update_fee,
            'DELETE_FEES': self._execute_delete_fees,
            'GET_FEES': self._execute_get_fees,
            'GET_FEE_SUMMARY': self._execute_get_fee_summary,
            'GET_SCHOOLS_WITHOUT_FEES': self._execute_get_schools_without_fees,
            'CREATE_MISSING_FEES': self._execute_create_missing_fees,
            'CREATE_FEES_MULTIPLE_SCHOOLS': self._execute_create_fees_multiple_schools,
            'GET_RECOVERY_REPORT': self._execute_get_recovery_report,
            'BULK_UPDATE_FEES': self._execute_bulk_update_fees,

            # Inventory actions
            'GET_ITEMS': self._execute_get_inventory_items,
            'GET_SUMMARY': self._execute_get_inventory_summary,
            'UPDATE_ITEM_STATUS': self._execute_update_item_status,
            'DELETE_ITEM': self._execute_delete_item,
            'BULK_DELETE_ITEMS': self._execute_bulk_delete_items,

            # HR actions
            'MARK_ATTENDANCE': self._execute_mark_attendance,
            'GET_ATTENDANCE': self._execute_get_attendance,
            'GET_ABSENT_TODAY': self._execute_get_absent_today,
            'DELETE_ATTENDANCE': self._execute_delete_attendance,

            # Broadcast actions
            'SEND_TO_CLASS_PARENTS': self._execute_broadcast_class,
            'SEND_TO_ALL_PARENTS': self._execute_broadcast_all_parents,
            'SEND_TO_TEACHERS': self._execute_broadcast_teachers,
        }

        executor_fn = executors.get(action_name)
        if not executor_fn:
            return {
                "success": False,
                "message": f"No executor for action: {action_name}",
                "data": None,
                "error": "Executor not implemented"
            }

        try:
            return executor_fn(params)
        except Exception as e:
            return {
                "success": False,
                "message": f"Action failed: {str(e)}",
                "data": None,
                "error": str(e)
            }

    # ============================================
    # FEE EXECUTORS
    # ============================================

    def _execute_create_monthly_fees(self, params: Dict) -> Dict:
        """Create monthly fees for a school."""
        import logging
        logger = logging.getLogger(__name__)

        from students.views import create_new_month_fees

        logger.info(f"Executing CREATE_MONTHLY_FEES with params: {params}")

        request = self._make_request('post', '/api/fees/create/', {
            'school_id': params.get('school_id'),
            'month': params.get('month'),
            'force_overwrite': params.get('force_overwrite', False)
        })

        response = create_new_month_fees(request)
        logger.info(f"create_new_month_fees response: status={getattr(response, 'status_code', 'N/A')}, data={getattr(response, 'data', 'N/A')}")

        if hasattr(response, 'data'):
            data = response.data
            school_id = params.get('school_id')
            month = params.get('month')

            # Try to get school name
            try:
                from students.models import School
                school = School.objects.get(id=school_id)
                school_name = school.name
            except:
                school_name = f"School #{school_id}"

            if response.status_code in [200, 201]:
                # Build detailed success message
                records = data.get('records_created', 0)
                message = f"Created {records} fee records for {school_name} - {month}"
                data['school_name'] = school_name
                return {
                    "success": True,
                    "message": message,
                    "data": data
                }
            elif response.status_code == 409:
                # Records already exist - ask user if they want to overwrite
                return {
                    "success": False,
                    "message": f"Fee records for {school_name} - {month} already exist. Do you want to overwrite them?",
                    "data": {
                        "school_id": school_id,
                        "school_name": school_name,
                        "month": month,
                        "existing_records": True
                    },
                    "needs_overwrite_confirmation": True,
                    "error": data.get('warning')
                }
            else:
                message = data.get('error', 'Fee creation failed')
                return {
                    "success": False,
                    "message": message,
                    "data": data,
                    "error": data.get('error')
                }

        return {"success": False, "message": "Unknown error", "data": None}

    def _execute_create_fees_all_schools(self, params: Dict) -> Dict:
        """Create monthly fees for ALL schools."""
        from students.models import School
        from students.views import create_new_month_fees

        month = params.get('month')
        force_overwrite = params.get('force_overwrite', False)

        # Get all active schools
        schools = School.objects.filter(is_active=True)

        results = []
        total_created = 0
        errors = []

        for school in schools:
            try:
                request = self._make_request('post', '/api/fees/create/', {
                    'school_id': school.id,
                    'month': month,
                    'force_overwrite': force_overwrite
                })

                response = create_new_month_fees(request)

                if hasattr(response, 'data'):
                    data = response.data
                    if response.status_code in [200, 201]:
                        created = data.get('records_created', 0)
                        total_created += created
                        results.append({
                            'school_id': school.id,
                            'school_name': school.name,
                            'records_created': created,
                            'success': True
                        })
                    else:
                        errors.append({
                            'school_id': school.id,
                            'school_name': school.name,
                            'error': data.get('error', 'Unknown error')
                        })
            except Exception as e:
                errors.append({
                    'school_id': school.id,
                    'school_name': school.name,
                    'error': str(e)
                })

        success_count = len(results)
        error_count = len(errors)

        return {
            "success": success_count > 0,
            "message": f"Created {total_created} fee records across {success_count} school(s)" +
                      (f" ({error_count} school(s) had errors)" if error_count > 0 else ""),
            "data": {
                "total_records_created": total_created,
                "schools_processed": success_count,
                "schools_with_errors": error_count,
                "results": results,
                "errors": errors if errors else None,
                "month": month
            }
        }

    def _execute_create_single_fee(self, params: Dict) -> Dict:
        """Create single fee record for one student."""
        from students.views import create_single_fee
        from students.models import Student

        student_id = params.get('student_id')

        # Get student info for response message
        try:
            student = Student.objects.get(id=student_id)
            student_name = student.name
            school_name = student.school.name
        except Student.DoesNotExist:
            return {"success": False, "message": f"Student #{student_id} not found", "data": None}

        request_data = {
            'student_id': student_id,
            'month': params.get('month'),
            'paid_amount': params.get('paid_amount', 0)
        }

        # Include total_fee if provided
        if params.get('total_fee'):
            request_data['total_fee'] = params.get('total_fee')

        request = self.factory.post(
            '/api/fees/create-single/',
            data=json.dumps(request_data),
            content_type='application/json'
        )
        request.user = self.user

        response = create_single_fee(request)

        if hasattr(response, 'data'):
            data = response.data
            month = params.get('month')
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": f"Created fee for {student_name} ({school_name}) - {month}",
                    "data": {
                        **data,
                        "student_name": student_name,
                        "school_name": school_name
                    }
                }

            # Handle specific error cases with better messages
            error_msg = data.get('error', 'Fee creation failed')

            # If fee already exists, provide helpful info
            if response.status_code == 409 and 'existing_fee_id' in data:
                error_msg = f"{error_msg}. Use 'update fee for {student_name}' to modify it."

            return {
                "success": False,
                "message": error_msg,
                "data": data,
                "error": error_msg
            }

        return {"success": False, "message": "Unknown error creating fee", "data": None}

    def _execute_update_fee(self, params: Dict) -> Dict:
        """Update fee payment."""
        from students.models import Fee
        from datetime import date, timedelta

        fee_id = params.get('fee_id')
        paid_amount = params.get('paid_amount')
        date_received = params.get('date_received')
        total_fee = params.get('total_fee')

        try:
            fee = Fee.objects.get(id=fee_id)
        except Fee.DoesNotExist:
            return {"success": False, "message": f"Fee #{fee_id} not found", "data": None}

        # Handle special payment amount keywords
        special_amounts = ['full', 'total', 'balance', 'remaining', 'payable', 'pending', 'due']
        paid_amount_str = str(paid_amount).lower().strip() if paid_amount else ''

        if paid_amount_str in special_amounts:
            if paid_amount_str in ['full', 'total']:
                paid_amount = float(fee.total_fee)
            else:
                paid_amount = float(fee.balance_due)

        # Handle date_received special values
        if date_received:
            date_str = str(date_received).lower().strip()
            if date_str == 'today':
                date_received = date.today()
            elif date_str == 'yesterday':
                date_received = date.today() - timedelta(days=1)
            else:
                # Try to parse the date
                try:
                    from datetime import datetime
                    # Try various date formats
                    for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y']:
                        try:
                            date_received = datetime.strptime(date_str, fmt).date()
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass  # Keep original value if parsing fails

        # Update fee fields
        updates_made = []

        if paid_amount is not None and paid_amount != '':
            fee.paid_amount = float(paid_amount)
            fee.balance_due = max(0, float(fee.total_fee) - float(paid_amount))

            if fee.balance_due == 0:
                fee.status = 'Paid'
            elif fee.paid_amount > 0:
                fee.status = 'Partial'
            else:
                fee.status = 'Pending'
            updates_made.append(f"payment PKR {float(paid_amount):,.0f}")

        if date_received:
            fee.date_received = date_received
            updates_made.append(f"date received: {date_received}")

        if total_fee:
            old_total = float(fee.total_fee)
            fee.total_fee = float(total_fee)
            fee.balance_due = max(0, float(total_fee) - float(fee.paid_amount))

            if fee.balance_due == 0 and float(fee.paid_amount) >= float(total_fee):
                fee.status = 'Paid'
            elif fee.paid_amount > 0:
                fee.status = 'Partial'
            else:
                fee.status = 'Pending'
            updates_made.append(f"total fee: PKR {old_total:,.0f} → PKR {float(total_fee):,.0f}")

        fee.save()

        student_name = fee.student_name  # Fee model has student_name directly
        update_desc = ", ".join(updates_made) if updates_made else "no changes"

        return {
            "success": True,
            "message": f"Updated fee for {student_name} ({fee.month}): {update_desc}",
            "data": {
                "fee_id": fee.id,
                "student_name": student_name,
                "month": fee.month,
                "total_fee": float(fee.total_fee),
                "paid_amount": float(fee.paid_amount),
                "balance_due": float(fee.balance_due),
                "status": fee.status,
                "date_received": str(fee.date_received) if fee.date_received else None
            }
        }

    def _execute_delete_fees(self, params: Dict) -> Dict:
        """Delete fee records."""
        from students.views import delete_fees

        request = self.factory.post(
            '/api/fees/delete/',
            data=json.dumps({
                'fee_ids': params.get('fee_ids', [])
            }),
            content_type='application/json'
        )
        request.user = self.user

        response = delete_fees(request)

        if hasattr(response, 'data'):
            data = response.data
            return {
                "success": response.status_code == 200,
                "message": data.get('message', 'Fees deleted'),
                "data": data,
                "error": data.get('error')
            }

        return {"success": False, "message": "Unknown error", "data": None}

    def _execute_get_fees(self, params: Dict) -> Dict:
        """Query fee records with filters. Month is required."""
        from students.models import Fee, School
        from django.db.models import Q, Sum, Count

        month = params.get('month')
        if not month:
            return {"success": False, "message": "Month is required. Please specify the month (e.g., 'show fees for Jan-2026').", "data": None}

        # Build queryset with required month filter
        fees = Fee.objects.select_related('school').filter(month=month)

        # Resolve school_name to school_id if provided
        if params.get('school_name') and not params.get('school_id'):
            try:
                school = School.objects.filter(
                    Q(name__icontains=params['school_name']) |
                    Q(short_name__icontains=params['school_name'])
                ).first()
                if school:
                    params['school_id'] = school.id
            except Exception:
                pass

        # Apply filters
        if params.get('school_id'):
            fees = fees.filter(school_id=params['school_id'])

        if params.get('class'):
            student_class = params['class']
            # Fee model has student_class field directly
            fees = fees.filter(
                Q(student_class__icontains=student_class) |
                Q(student_class__iexact=student_class)
            )

        if params.get('status'):
            fees = fees.filter(status=params['status'])

        if params.get('student_id'):
            fees = fees.filter(student_id=params['student_id'])

        # Get accurate totals using database aggregation (ALL records)
        aggregates = fees.aggregate(
            total_fee=Sum('total_fee'),
            total_paid=Sum('paid_amount'),
            total_pending=Sum('balance_due'),
            total_count=Count('id')
        )

        total_count = aggregates['total_count'] or 0
        total_fee = float(aggregates['total_fee'] or 0)
        total_paid = float(aggregates['total_paid'] or 0)
        total_pending = float(aggregates['total_pending'] or 0)

        # Order by id descending and get sample for display
        fees = fees.order_by('-id')

        # Convert to list for response (limit to 50 for display)
        fee_list = []
        for fee in fees[:50]:
            fee_list.append({
                'id': fee.id,
                'student_name': fee.student_name,
                'student_class': fee.student_class,
                'school_name': fee.school.name if fee.school else 'Unknown',
                'month': fee.month,
                'total_fee': float(fee.total_fee),
                'paid_amount': float(fee.paid_amount),
                'balance_due': float(fee.balance_due),
                'status': fee.status,
                'date_received': str(fee.date_received) if fee.date_received else None
            })

        # Build descriptive message
        filter_desc = []
        if params.get('status'):
            filter_desc.append(f"status={params['status']}")
        if params.get('school_id'):
            filter_desc.append(f"school")
        if params.get('month'):
            filter_desc.append(f"month={params['month']}")
        if params.get('class'):
            filter_desc.append(f"class={params['class']}")
        if params.get('student_id'):
            filter_desc.append(f"student")

        filter_text = f" ({', '.join(filter_desc)})" if filter_desc else ""

        message = f"Found {total_count} fee record(s){filter_text}"
        if total_count > 0:
            message += f" | Total: PKR {total_fee:,.0f} | Paid: PKR {total_paid:,.0f} | Pending: PKR {total_pending:,.0f}"

        return {
            "success": True,
            "message": message,
            "data": {
                "results": fee_list,
                "count": total_count,
                "total_fee": total_fee,
                "total_paid": total_paid,
                "total_pending": total_pending,
                "showing": len(fee_list),
                "truncated": total_count > 50
            }
        }

    def _execute_get_fee_summary(self, params: Dict) -> Dict:
        """Get fee summary using database aggregation (not limited to 50 records)."""
        from students.models import Fee, School
        from django.db.models import Sum, Count, Q

        month = params.get('month')
        if not month:
            return {"success": False, "message": "Month is required for fee summary. Please specify the month (e.g., 'Jan-2026').", "data": None}

        # Build the query with filters
        fees = Fee.objects.filter(month=month)

        # Track filter context for message
        school_name = None

        # Resolve school_name to school_id if provided
        if params.get('school_name') and not params.get('school_id'):
            try:
                school = School.objects.filter(
                    Q(name__icontains=params['school_name']) |
                    Q(short_name__icontains=params['school_name'])
                ).first()
                if school:
                    params['school_id'] = school.id
                    school_name = school.name
            except Exception:
                pass

        if params.get('school_id'):
            fees = fees.filter(school_id=params['school_id'])
            if not school_name:
                try:
                    school_name = School.objects.get(id=params['school_id']).name
                except School.DoesNotExist:
                    school_name = f"School #{params['school_id']}"

        if params.get('class'):
            student_class = params['class']
            fees = fees.filter(
                Q(student_class__icontains=student_class) |
                Q(student_class__iexact=student_class)
            )

        if params.get('status'):
            fees = fees.filter(status=params['status'])

        # Use database aggregation for accurate totals
        aggregates = fees.aggregate(
            total_fee=Sum('total_fee'),
            total_received=Sum('paid_amount'),
            total_pending=Sum('balance_due'),
            total_records=Count('id'),
            paid_count=Count('id', filter=Q(status='Paid')),
            pending_count=Count('id', filter=Q(status='Pending')),
            partial_count=Count('id', filter=Q(status='Partial'))
        )

        summary = {
            "total_records": aggregates['total_records'] or 0,
            "total_fee": float(aggregates['total_fee'] or 0),
            "total_received": float(aggregates['total_received'] or 0),
            "total_pending": float(aggregates['total_pending'] or 0),
            "paid_count": aggregates['paid_count'] or 0,
            "pending_count": aggregates['pending_count'] or 0,
            "partial_count": aggregates['partial_count'] or 0,
            "month": month,
            "school_name": school_name
        }

        # Build descriptive message
        scope = f"{school_name}" if school_name else "All Schools"
        message = f"Fee Summary for {month} ({scope}): Total PKR {summary['total_fee']:,.0f} | Received PKR {summary['total_received']:,.0f} | Pending PKR {summary['total_pending']:,.0f}"

        return {
            "success": True,
            "message": message,
            "data": summary
        }

    def _execute_get_schools_without_fees(self, params: Dict) -> Dict:
        """Get schools that don't have fee records for a specific month, with recovery rate info."""
        from students.models import School, Fee, Student
        from django.db.models import Sum, Count

        month = params.get('month')

        # Get all active schools with student counts
        all_schools = School.objects.filter(is_active=True)

        # Get fee statistics per school for this month
        # Fee model has direct school ForeignKey, not through student
        fee_stats = Fee.objects.filter(month=month).values('school_id').annotate(
            fee_count=Count('id'),
            total_fee_sum=Sum('total_fee'),
            paid_amount_sum=Sum('paid_amount'),
            balance_due_sum=Sum('balance_due')
        )

        # Create a lookup dict for fee stats
        fee_stats_dict = {
            stat['school_id']: stat for stat in fee_stats
        }

        # Categorize schools
        schools_without_fees = []
        schools_with_fees = []
        total_recovery = 0
        total_fee_amount = 0

        for school in all_schools:
            # Count active students in this school
            # Student model uses status='Active' not is_active
            student_count = Student.objects.filter(school=school, status='Active').count()

            if school.id in fee_stats_dict:
                # School has fees - calculate recovery rate
                stats = fee_stats_dict[school.id]
                total_fee = float(stats['total_fee_sum'] or 0)
                paid_amount = float(stats['paid_amount_sum'] or 0)
                balance_due = float(stats['balance_due_sum'] or 0)
                recovery_rate = (paid_amount / total_fee * 100) if total_fee > 0 else 0

                total_recovery += paid_amount
                total_fee_amount += total_fee

                schools_with_fees.append({
                    'id': school.id,
                    'name': school.name,
                    'student_count': student_count,
                    'fee_records': stats['fee_count'],
                    'total_fee': total_fee,
                    'paid_amount': paid_amount,
                    'balance_due': balance_due,
                    'recovery_rate': round(recovery_rate, 1)
                })
            else:
                # School has no fees
                schools_without_fees.append({
                    'id': school.id,
                    'name': school.name,
                    'student_count': student_count
                })

        # Calculate overall recovery rate
        overall_recovery_rate = (total_recovery / total_fee_amount * 100) if total_fee_amount > 0 else 0

        if not schools_without_fees:
            # All schools have fees - show recovery summary
            low_recovery = [s for s in schools_with_fees if s['recovery_rate'] < 50]
            summary_msg = f"All schools have fee records for {month}. Overall recovery: {overall_recovery_rate:.1f}%"
            if low_recovery:
                low_names = ", ".join([s['name'] for s in low_recovery[:3]])
                summary_msg += f". Low recovery (<50%): {low_names}"

            return {
                "success": True,
                "message": summary_msg,
                "data": {
                    "month": month,
                    "schools_without_fees": [],
                    "schools_with_fees": schools_with_fees,
                    "count_without": 0,
                    "count_with": len(schools_with_fees),
                    "overall_recovery_rate": round(overall_recovery_rate, 1),
                    "total_fee": total_fee_amount,
                    "total_collected": total_recovery,
                    "total_pending": total_fee_amount - total_recovery
                }
            }

        # Some schools missing fees - show ALL school names
        # List all missing schools with student counts
        missing_list = "\n".join([f"  • {s['name']} ({s['student_count']} students)" for s in schools_without_fees])

        # Calculate total students missing fees
        total_students_missing = sum(s['student_count'] for s in schools_without_fees)

        # Build comprehensive message
        message_parts = [
            f"⚠️ {len(schools_without_fees)} school(s) don't have fee records for {month}:",
            missing_list,
            f"\nTotal students without fees: {total_students_missing}"
        ]

        if schools_with_fees:
            message_parts.append(f"Schools with fees: {len(schools_with_fees)} (Recovery: {overall_recovery_rate:.1f}%)")

        return {
            "success": True,
            "message": "\n".join(message_parts),
            "data": {
                "month": month,
                "schools_without_fees": schools_without_fees,
                "schools_with_fees": schools_with_fees,
                "count_without": len(schools_without_fees),
                "count_with": len(schools_with_fees),
                "total_students_missing_fees": total_students_missing,
                "overall_recovery_rate": round(overall_recovery_rate, 1) if schools_with_fees else 0,
                "total_fee": total_fee_amount,
                "total_collected": total_recovery,
                "total_pending": total_fee_amount - total_recovery
            }
        }

    def _execute_create_missing_fees(self, params: Dict) -> Dict:
        """
        Create fees for:
        1. Schools that don't have any fee records for the month
        2. Students within schools that DO have fees but are missing their individual fee record
           (e.g., students added after monthly fees were created)
        """
        from students.models import School, Fee, Student
        from students.views import create_new_month_fees, create_single_fee

        month = params.get('month')
        school_id = params.get('school_id')  # Optional: filter to specific school

        # Track results
        schools_created = []
        students_created = []
        total_school_records = 0
        total_student_records = 0
        errors = []

        # Get schools to check
        all_schools = School.objects.filter(is_active=True)
        if school_id:
            all_schools = all_schools.filter(id=school_id)

        # Find which schools have fees for this month
        schools_with_fees_ids = set(
            Fee.objects.filter(month=month).values_list('school_id', flat=True).distinct()
        )

        # PART 1: Create fees for schools WITHOUT any fee records
        schools_without_fees = [s for s in all_schools if s.id not in schools_with_fees_ids]

        for school in schools_without_fees:
            try:
                request = self._make_request('post', '/api/fees/create/', {
                    'school_id': school.id,
                    'month': month,
                    'force_overwrite': False
                })
                response = create_new_month_fees(request)

                if hasattr(response, 'data') and response.status_code in [200, 201]:
                    created = response.data.get('records_created', 0)
                    total_school_records += created
                    schools_created.append({
                        'school_name': school.name,
                        'records_created': created
                    })
            except Exception as e:
                errors.append(f"School {school.name}: {str(e)}")

        # PART 2: Find students WITHOUT fee records in schools that DO have fees
        schools_with_fees = [s for s in all_schools if s.id in schools_with_fees_ids]

        for school in schools_with_fees:
            # Get all active students in this school
            active_students = Student.objects.filter(school=school, status='Active')

            # Get student IDs that already have fee records for this month in this school
            students_with_fees = set(
                Fee.objects.filter(school=school, month=month).values_list('student_id', flat=True)
            )

            # Find students missing fee records
            students_without_fees = [s for s in active_students if s.id not in students_with_fees]

            for student in students_without_fees:
                try:
                    # Use the existing create_single_fee API
                    request = self._make_request('post', '/api/fees/create-single/', {
                        'student_id': student.id,
                        'month': month,
                        'paid_amount': 0
                    })
                    response = create_single_fee(request)

                    if hasattr(response, 'data') and response.status_code in [200, 201]:
                        total_student_records += 1
                        students_created.append({
                            'student_name': student.name,
                            'school_name': school.name
                        })
                except Exception as e:
                    errors.append(f"Student {student.name} ({school.name}): {str(e)}")

        # Build response message
        total_created = total_school_records + total_student_records

        if total_created == 0:
            return {
                "success": True,
                "message": f"All schools and students already have fee records for {month}. Nothing to create.",
                "data": {
                    "month": month,
                    "schools_processed": 0,
                    "students_processed": 0,
                    "total_records_created": 0
                }
            }

        message_parts = []
        if total_school_records > 0:
            school_names = ", ".join([s['school_name'] for s in schools_created[:3]])
            if len(schools_created) > 3:
                school_names += f" +{len(schools_created) - 3} more"
            message_parts.append(f"{total_school_records} records for {len(schools_created)} school(s) ({school_names})")

        if total_student_records > 0:
            student_names = ", ".join([s['student_name'] for s in students_created[:3]])
            if len(students_created) > 3:
                student_names += f" +{len(students_created) - 3} more"
            message_parts.append(f"{total_student_records} records for {len(students_created)} student(s) ({student_names})")

        message = f"Created {total_created} fee records for {month}: " + "; ".join(message_parts)
        if errors:
            message += f". {len(errors)} error(s) occurred."

        return {
            "success": True,
            "message": message,
            "data": {
                "month": month,
                "total_records_created": total_created,
                "schools_created": schools_created,
                "students_created": students_created,
                "errors": errors if errors else None
            }
        }

    def _execute_create_fees_multiple_schools(self, params: Dict) -> Dict:
        """Create fees for multiple specific schools by name."""
        from students.models import School, Fee
        from students.views import create_new_month_fees
        import difflib

        month = params.get('month')
        school_names = params.get('school_names', [])

        # Handle string input (comma-separated or bullet-separated)
        if isinstance(school_names, str):
            # Clean up the string - remove bullet points, parentheses content, etc.
            cleaned = school_names.replace('•', ',').replace('\n', ',')
            # Extract school names, removing student counts in parentheses
            import re
            school_names = []
            for part in cleaned.split(','):
                # Remove "(XX students)" pattern
                name = re.sub(r'\s*\(\d+\s*students?\)', '', part).strip()
                if name:
                    school_names.append(name)

        if not school_names:
            return {
                "success": False,
                "message": "No school names provided. Please specify which schools to create fees for."
            }

        # Get all active schools for matching
        all_schools = School.objects.filter(is_active=True)
        school_lookup = {s.name.lower(): s for s in all_schools}

        # Match school names using fuzzy matching
        matched_schools = []
        unmatched_names = []

        for name in school_names:
            name_lower = name.lower().strip()

            # Try exact match first
            if name_lower in school_lookup:
                matched_schools.append(school_lookup[name_lower])
                continue

            # Try fuzzy match
            best_match = None
            best_score = 0
            for school_name, school in school_lookup.items():
                score = difflib.SequenceMatcher(None, name_lower, school_name).ratio()
                if score > best_score and score >= 0.6:
                    best_score = score
                    best_match = school

            if best_match:
                matched_schools.append(best_match)
            else:
                unmatched_names.append(name)

        if not matched_schools:
            return {
                "success": False,
                "message": f"Could not find any matching schools for: {', '.join(school_names)}"
            }

        # Create fees for matched schools
        results = []
        total_created = 0
        errors = []

        for school in matched_schools:
            try:
                request = self._make_request('post', '/api/fees/create/', {
                    'school_id': school.id,
                    'month': month,
                    'force_overwrite': False
                })

                response = create_new_month_fees(request)

                if hasattr(response, 'data'):
                    data = response.data
                    if response.status_code in [200, 201]:
                        created = data.get('records_created', 0)
                        total_created += created
                        results.append({
                            'school_id': school.id,
                            'school_name': school.name,
                            'records_created': created,
                            'success': True
                        })
                    else:
                        errors.append({
                            'school_id': school.id,
                            'school_name': school.name,
                            'error': data.get('error', 'Unknown error')
                        })
            except Exception as e:
                errors.append({
                    'school_id': school.id,
                    'school_name': school.name,
                    'error': str(e)
                })

        success_count = len(results)
        error_count = len(errors)
        school_names_display = ", ".join([r['school_name'] for r in results])

        message = f"Created {total_created} fee records for {success_count} school(s) ({school_names_display})"
        if unmatched_names:
            message += f". Could not match: {', '.join(unmatched_names)}"
        if error_count > 0:
            message += f". {error_count} school(s) had errors."

        return {
            "success": success_count > 0,
            "message": message,
            "data": {
                "month": month,
                "total_records_created": total_created,
                "schools_processed": success_count,
                "schools_with_errors": error_count,
                "unmatched_schools": unmatched_names,
                "results": results,
                "errors": errors if errors else None
            }
        }

    def _execute_get_recovery_report(self, params: Dict) -> Dict:
        """Get detailed fee recovery report for all schools."""
        from students.models import School, Fee, Student
        from django.db.models import Sum, Count

        month = params.get('month')

        # Get all active schools
        all_schools = School.objects.filter(is_active=True)

        # Get fee statistics per school for this month
        # Fee model has direct school ForeignKey
        fee_stats = Fee.objects.filter(month=month).values('school_id').annotate(
            fee_count=Count('id'),
            total_fee_sum=Sum('total_fee'),
            paid_amount_sum=Sum('paid_amount'),
            balance_due_sum=Sum('balance_due')
        )

        fee_stats_dict = {stat['school_id']: stat for stat in fee_stats}

        # Build report
        report = []
        total_fee_all = 0
        total_collected_all = 0
        total_pending_all = 0
        schools_with_fees_count = 0
        schools_without_fees_count = 0

        for school in all_schools:
            # Student model uses status='Active' not is_active
            student_count = Student.objects.filter(school=school, status='Active').count()

            if school.id in fee_stats_dict:
                stats = fee_stats_dict[school.id]
                total_fee = float(stats['total_fee_sum'] or 0)
                paid_amount = float(stats['paid_amount_sum'] or 0)
                balance_due = float(stats['balance_due_sum'] or 0)
                recovery_rate = (paid_amount / total_fee * 100) if total_fee > 0 else 0

                total_fee_all += total_fee
                total_collected_all += paid_amount
                total_pending_all += balance_due
                schools_with_fees_count += 1

                report.append({
                    'school_id': school.id,
                    'school_name': school.name,
                    'student_count': student_count,
                    'fee_records': stats['fee_count'],
                    'total_fee': total_fee,
                    'collected': paid_amount,
                    'pending': balance_due,
                    'recovery_rate': round(recovery_rate, 1),
                    'status': 'has_fees'
                })
            else:
                schools_without_fees_count += 1
                report.append({
                    'school_id': school.id,
                    'school_name': school.name,
                    'student_count': student_count,
                    'fee_records': 0,
                    'total_fee': 0,
                    'collected': 0,
                    'pending': 0,
                    'recovery_rate': 0,
                    'status': 'no_fees'
                })

        # Sort by recovery rate (ascending - lowest first for attention)
        report.sort(key=lambda x: (x['status'] == 'has_fees', x['recovery_rate']))

        overall_recovery = (total_collected_all / total_fee_all * 100) if total_fee_all > 0 else 0

        # Build summary message
        low_recovery_schools = [s for s in report if s['status'] == 'has_fees' and s['recovery_rate'] < 50]
        high_recovery_schools = [s for s in report if s['status'] == 'has_fees' and s['recovery_rate'] >= 80]

        msg_parts = [f"Recovery Report for {month}:"]
        msg_parts.append(f"Overall: {overall_recovery:.1f}% (PKR {total_collected_all:,.0f} / {total_fee_all:,.0f})")

        if schools_without_fees_count > 0:
            msg_parts.append(f"⚠️ {schools_without_fees_count} school(s) have no fee records")

        if low_recovery_schools:
            low_names = ", ".join([s['school_name'] for s in low_recovery_schools[:3]])
            msg_parts.append(f"🔴 Low recovery (<50%): {low_names}")

        if high_recovery_schools:
            msg_parts.append(f"🟢 {len(high_recovery_schools)} school(s) with good recovery (≥80%)")

        return {
            "success": True,
            "message": " | ".join(msg_parts),
            "data": {
                "month": month,
                "schools": report,
                "summary": {
                    "total_schools": len(all_schools),
                    "schools_with_fees": schools_with_fees_count,
                    "schools_without_fees": schools_without_fees_count,
                    "total_fee": total_fee_all,
                    "total_collected": total_collected_all,
                    "total_pending": total_pending_all,
                    "overall_recovery_rate": round(overall_recovery, 1)
                }
            }
        }

    def _execute_bulk_update_fees(self, params: Dict) -> Dict:
        """Update multiple fees at once."""
        from students.models import Fee

        fee_ids = params.get('fee_ids', [])
        paid_amount = params.get('paid_amount')

        if not fee_ids:
            return {"success": False, "message": "No fee IDs provided", "data": None}

        # Handle special payment amount keywords
        special_amounts = ['full', 'total', 'balance', 'remaining', 'payable', 'pending', 'due']
        paid_amount_str = str(paid_amount).lower().strip() if paid_amount else ''
        use_special = paid_amount_str in special_amounts

        updated_count = 0
        total_amount_updated = 0
        errors = []

        for fee_id in fee_ids:
            try:
                fee = Fee.objects.get(id=fee_id)

                if use_special:
                    if paid_amount_str in ['full', 'total']:
                        # Pay full amount
                        amount_to_pay = float(fee.total_fee)
                    else:
                        # Pay remaining balance
                        amount_to_pay = float(fee.balance_due)
                else:
                    amount_to_pay = float(paid_amount)

                # Update the fee
                fee.paid_amount = amount_to_pay
                fee.balance_due = max(0, float(fee.total_fee) - amount_to_pay)

                if fee.balance_due == 0:
                    fee.status = 'Paid'
                elif fee.paid_amount > 0:
                    fee.status = 'Partial'
                else:
                    fee.status = 'Pending'

                fee.save()
                updated_count += 1
                total_amount_updated += amount_to_pay

            except Fee.DoesNotExist:
                errors.append(f"Fee #{fee_id} not found")
            except Exception as e:
                errors.append(f"Fee #{fee_id}: {str(e)}")

        if updated_count == 0:
            return {
                "success": False,
                "message": "No fees were updated",
                "data": {"errors": errors}
            }

        message = f"Updated {updated_count} fee record(s). Total amount: PKR {total_amount_updated:,.0f}"
        if errors:
            message += f" ({len(errors)} error(s))"

        return {
            "success": True,
            "message": message,
            "data": {
                "updated_count": updated_count,
                "total_amount": total_amount_updated,
                "errors": errors if errors else None
            }
        }

    # ============================================
    # INVENTORY EXECUTORS
    # ============================================

    def _execute_get_inventory_items(self, params: Dict) -> Dict:
        """Query inventory items."""
        from inventory.views import InventoryItemViewSet

        query_params = {}
        if params.get('category'):
            query_params['category'] = params['category']
        if params.get('status'):
            query_params['status'] = params['status']
        if params.get('school_id'):
            query_params['school'] = params['school_id']
        if params.get('search'):
            query_params['search'] = params['search']

        request = self.factory.get('/api/inventory/items/', query_params)
        request.user = self.user

        viewset = InventoryItemViewSet.as_view({'get': 'list'})
        response = viewset(request)
        response.render()

        data = response.data
        results = data.get('results', data) if isinstance(data, dict) else data
        count = len(results) if isinstance(results, list) else data.get('count', 0)

        return {
            "success": True,
            "message": f"Found {count} inventory item(s)",
            "data": {
                "results": results[:50] if isinstance(results, list) else results,
                "count": count
            }
        }

    def _execute_get_inventory_summary(self, params: Dict) -> Dict:
        """Get inventory summary."""
        from inventory.views import InventorySummaryView

        query_params = {}
        if params.get('school_id'):
            query_params['school'] = params['school_id']

        request = self.factory.get('/api/inventory/summary/', query_params)
        request.user = self.user

        view = InventorySummaryView.as_view()
        response = view(request)
        response.render()

        return {
            "success": True,
            "message": "Inventory summary retrieved",
            "data": response.data
        }

    def _execute_update_item_status(self, params: Dict) -> Dict:
        """Update inventory item status."""
        from inventory.views import InventoryItemViewSet

        item_id = params.get('item_id')
        request = self.factory.patch(
            f'/api/inventory/items/{item_id}/',
            data=json.dumps({'status': params.get('status')}),
            content_type='application/json'
        )
        request.user = self.user

        viewset = InventoryItemViewSet.as_view({'patch': 'partial_update'})
        response = viewset(request, pk=item_id)
        response.render()

        return {
            "success": response.status_code == 200,
            "message": f"Item status updated to {params.get('status')}",
            "data": response.data
        }

    def _execute_delete_item(self, params: Dict) -> Dict:
        """Delete inventory item."""
        from inventory.views import InventoryItemViewSet

        item_id = params.get('item_id')
        request = self.factory.delete(f'/api/inventory/items/{item_id}/')
        request.user = self.user

        viewset = InventoryItemViewSet.as_view({'delete': 'destroy'})
        response = viewset(request, pk=item_id)

        return {
            "success": response.status_code == 204,
            "message": "Item deleted",
            "data": None
        }

    def _execute_bulk_delete_items(self, params: Dict) -> Dict:
        """Delete multiple inventory items."""
        item_ids = params.get('item_ids', [])
        deleted = 0

        for item_id in item_ids:
            result = self._execute_delete_item({'item_id': item_id})
            if result['success']:
                deleted += 1

        return {
            "success": deleted > 0,
            "message": f"Deleted {deleted} of {len(item_ids)} item(s)",
            "data": {"deleted_count": deleted}
        }

    # ============================================
    # HR EXECUTORS
    # ============================================

    def _execute_mark_attendance(self, params: Dict) -> Dict:
        """Mark staff attendance."""
        from commands.views import StaffAttendanceViewSet
        from datetime import date

        request = self.factory.post(
            '/api/commands/staff-attendance/',
            data=json.dumps({
                'staff': params.get('staff_id'),
                'status': params.get('status'),
                'date': params.get('date', str(date.today())),
                'notes': params.get('notes', 'Marked via AI Agent')
            }),
            content_type='application/json'
        )
        request.user = self.user

        viewset = StaffAttendanceViewSet.as_view({'post': 'create'})
        response = viewset(request)
        response.render()

        return {
            "success": response.status_code in [200, 201],
            "message": f"Attendance marked as {params.get('status')}",
            "data": response.data if hasattr(response, 'data') else None
        }

    def _execute_get_attendance(self, params: Dict) -> Dict:
        """Query attendance records."""
        from commands.views import StaffAttendanceViewSet

        query_params = {}
        if params.get('date'):
            query_params['date'] = params['date']
        if params.get('status'):
            query_params['status'] = params['status']
        if params.get('school_id'):
            query_params['school'] = params['school_id']

        request = self.factory.get('/api/commands/staff-attendance/', query_params)
        request.user = self.user

        viewset = StaffAttendanceViewSet.as_view({'get': 'list'})
        response = viewset(request)
        response.render()

        data = response.data
        results = data.get('results', data) if isinstance(data, dict) else data
        count = len(results) if isinstance(results, list) else 0

        return {
            "success": True,
            "message": f"Found {count} attendance record(s)",
            "data": {"results": results, "count": count}
        }

    def _execute_get_absent_today(self, params: Dict) -> Dict:
        """Get today's absent staff."""
        from commands.views import StaffAttendanceViewSet

        request = self.factory.get('/api/commands/staff-attendance/today/')
        request.user = self.user

        viewset = StaffAttendanceViewSet.as_view({'get': 'today'})
        response = viewset(request)
        response.render()

        return {
            "success": True,
            "message": response.data.get('total', 0) and f"Found {response.data.get('total')} attendance record(s) today" or "No attendance records for today",
            "data": response.data
        }

    def _execute_delete_attendance(self, params: Dict) -> Dict:
        """Delete attendance record."""
        from commands.views import StaffAttendanceViewSet

        att_id = params.get('attendance_id')
        request = self.factory.delete(f'/api/commands/staff-attendance/{att_id}/')
        request.user = self.user

        viewset = StaffAttendanceViewSet.as_view({'delete': 'destroy'})
        response = viewset(request, pk=att_id)

        return {
            "success": response.status_code == 204,
            "message": "Attendance record deleted",
            "data": None
        }

    # ============================================
    # BROADCAST EXECUTORS
    # ============================================

    def _execute_broadcast_class(self, params: Dict) -> Dict:
        """Send notification to class parents."""
        from commands.executor import CommandExecutor

        executor = CommandExecutor(self.user)
        return executor._handle_broadcast_to_class_parents({
            'class': params.get('class'),
            'message': params.get('message'),
            'school_id': params.get('school_id')
        }, {})

    def _execute_broadcast_all_parents(self, params: Dict) -> Dict:
        """Send notification to all parents."""
        from commands.executor import CommandExecutor

        executor = CommandExecutor(self.user)
        return executor._handle_broadcast_to_school_parents({
            'message': params.get('message'),
            'school_id': params.get('school_id')
        }, {})

    def _execute_broadcast_teachers(self, params: Dict) -> Dict:
        """Send notification to teachers."""
        from commands.executor import CommandExecutor

        executor = CommandExecutor(self.user)
        return executor._handle_broadcast_to_school_teachers({
            'message': params.get('message'),
            'school_id': params.get('school_id')
        }, {})
