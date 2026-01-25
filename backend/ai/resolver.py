"""
AI Parameter Resolver
=====================
Resolves fuzzy/alternative parameters to exact IDs.
Handles school name matching, student lookup, fee finding, etc.
"""

from typing import Dict, Any, List, Optional, Tuple
from difflib import SequenceMatcher


def fuzzy_match_score(s1: str, s2: str) -> float:
    """Calculate fuzzy match score between two strings (0-1)."""
    s1 = s1.lower().strip()
    s2 = s2.lower().strip()

    # Exact match
    if s1 == s2:
        return 1.0

    # One contains the other
    if s1 in s2 or s2 in s1:
        return 0.9

    # Sequence matching
    return SequenceMatcher(None, s1, s2).ratio()


def resolve_school(params: Dict[str, Any], context: Dict[str, Any]) -> Tuple[Optional[int], Optional[str]]:
    """
    Resolve school_id from school_name if needed.

    Returns:
        (school_id, error_message)
        - If resolved: (id, None)
        - If ambiguous: (None, "Multiple schools match: ...")
        - If not found: (None, "No school found matching: ...")
    """
    # If school_id already provided, use it
    if params.get('school_id'):
        return params['school_id'], None

    school_name = params.get('school_name')
    if not school_name:
        return None, None  # No school specified

    schools = context.get('schools', [])
    if not schools:
        return None, "No schools available in context"

    # Find matching schools
    matches = []
    for school in schools:
        score = fuzzy_match_score(school_name, school.get('name', ''))
        if score >= 0.6:  # Threshold for match
            matches.append((school, score))

    # Sort by score
    matches.sort(key=lambda x: x[1], reverse=True)

    if not matches:
        # No match found
        available = ", ".join([s.get('name', '') for s in schools[:5]])
        return None, f"No school found matching '{school_name}'. Available: {available}"

    if len(matches) == 1:
        # Single match - use it
        return matches[0][0]['id'], None

    # Check if top match is significantly better
    if matches[0][1] > 0.85 and matches[0][1] - matches[1][1] > 0.2:
        return matches[0][0]['id'], None

    # Multiple close matches - ask for clarification
    match_names = [m[0].get('name', '') for m in matches[:3]]
    return None, f"Multiple schools match '{school_name}': {', '.join(match_names)}. Please specify which one."


def resolve_school_from_db(school_name: str, accessible_school_ids: list = None) -> Tuple[Optional[int], Optional[str]]:
    """
    Resolve school from database using fuzzy matching.

    Args:
        school_name: The school name or number to resolve
        accessible_school_ids: Optional list of school IDs the user can access (for teachers).
                              If None, all active schools are searched (for admins).

    Returns:
        (school_id, error_message)
    """
    from students.models import School
    import logging
    logger = logging.getLogger(__name__)

    # Build base queryset - filter by accessible schools if provided
    if accessible_school_ids is not None:
        base_schools = School.objects.filter(is_active=True, id__in=accessible_school_ids)
        logger.info(f"Filtering to {len(accessible_school_ids)} accessible schools for teacher")
    else:
        base_schools = School.objects.filter(is_active=True)

    # Check if input is a number (user selecting from previous list)
    if school_name.strip().isdigit():
        selection = int(school_name.strip())
        schools = list(base_schools.order_by('name')[:10])
        if 1 <= selection <= len(schools):
            selected = schools[selection - 1]
            logger.info(f"User selected #{selection}: {selected.name} (ID: {selected.id})")
            return selected.id, None
        else:
            return None, f"Invalid selection. Please enter a number between 1 and {len(schools)}."

    schools = base_schools.all()
    logger.info(f"Resolving school name '{school_name}' from {schools.count()} schools")

    matches = []
    for school in schools:
        score = fuzzy_match_score(school_name, school.name)
        # Only log scores >= 0.5 to reduce noise
        if score >= 0.5:
            logger.debug(f"  '{school.name}' score: {score:.2f}")
            matches.append((school, score))

    matches.sort(key=lambda x: x[1], reverse=True)
    logger.info(f"Found {len(matches)} matches for '{school_name}'")

    if not matches:
        # Show all accessible schools with numbers for selection
        all_schools = list(base_schools.order_by('name')[:10])
        numbered_list = "\n".join([f"  {i+1}. {s.name}" for i, s in enumerate(all_schools)])
        return None, f"No school found matching '{school_name}'. Available schools:\n{numbered_list}\n\nReply with the number to select."

    if len(matches) == 1:
        logger.info(f"Single match: {matches[0][0].name} (ID: {matches[0][0].id})")
        return matches[0][0].id, None

    # If top match is significantly better than others, use it
    if matches[0][1] > 0.85 and matches[0][1] - matches[1][1] > 0.15:
        logger.info(f"Best match: {matches[0][0].name} (ID: {matches[0][0].id}, score: {matches[0][1]})")
        return matches[0][0].id, None

    # Multiple close matches - show ALL accessible schools alphabetically for consistent numbering
    # The number selection logic uses this same order
    all_schools = list(base_schools.order_by('name')[:10])
    numbered_all = "\n".join([f"  {i+1}. {s.name}" for i, s in enumerate(all_schools)])

    # Also mention which ones matched
    match_names = ", ".join([m[0].name for m in matches[:3]])

    return None, f"Multiple schools match '{school_name}' (best matches: {match_names}).\n\nAvailable schools:\n{numbered_all}\n\nReply with the number to select."


def resolve_fee_for_update(params: Dict[str, Any]) -> Tuple[Optional[int], Optional[str], Optional[Dict]]:
    """
    Resolve fee_id from alternative parameters.

    Supports:
    - Direct fee_id
    - student_name + school_name/school_id + optional month/class
    - student_id + optional month

    Returns:
        (fee_id, error_message, fee_data)
    """
    from students.models import Fee, Student
    from students.models import School
    from django.db.models import Q
    from datetime import date

    # If fee_id provided, verify it exists
    if params.get('fee_id'):
        try:
            fee = Fee.objects.select_related('school').get(id=params['fee_id'])
            return fee.id, None, {
                'student_name': fee.student_name,  # Fee model has student_name directly
                'school': fee.school.name if fee.school else 'Unknown',
                'month': fee.month,
                'current_paid': float(fee.paid_amount),
                'total_fee': float(fee.total_fee)
            }
        except Fee.DoesNotExist:
            return None, f"Fee #{params['fee_id']} not found", None

    # Try to find fee by student info
    student_name = params.get('student_name')
    student_id = params.get('student_id')
    school_name = params.get('school_name')
    school_id = params.get('school_id')
    student_class = params.get('class')
    month = params.get('month')

    # Default month to current if not specified
    if not month:
        month = date.today().strftime('%b-%Y')

    # Build student query
    student_query = Q()

    # If school+class provided but NO student name - need to ask which student
    if not student_name and not student_id and (school_id or school_name) and student_class:
        # List students in that class to let user pick
        students = Student.objects.filter(status='Active')

        if school_id:
            students = students.filter(school_id=school_id)
        elif school_name:
            resolved_school_id, err = self._resolve_school(school_name)
            if err:
                return None, err, None
            if resolved_school_id:
                students = students.filter(school_id=resolved_school_id)

        students = students.filter(
            Q(student_class__icontains=student_class) |
            Q(student_class__iexact=student_class)
        )

        if not students.exists():
            return None, f"No students found in class {student_class}", None

        # Get pending fees for this class - Fee model has student_class directly
        student_fees = Fee.objects.filter(
            Q(student_class__icontains=student_class) | Q(student_class__iexact=student_class),
            status__in=['Pending', 'Partial']
        )
        if school_id:
            student_fees = student_fees.filter(school_id=school_id)
        student_fees = student_fees.order_by('student_name')[:10]

        if not student_fees.exists():
            return None, f"No pending fees found for students in class {student_class}", None

        # Return list of students with pending fees for user to choose
        # Fee model has student_name directly
        fee_list = [f"  {i+1}. {f.student_name} - PKR {f.balance_due:,.0f} pending ({f.month})"
                    for i, f in enumerate(student_fees)]
        return None, f"Which student's fee do you want to update?\n\n" + "\n".join(fee_list) + "\n\nPlease specify the student name.", None

    if student_id:
        student_query &= Q(id=student_id)
    elif student_name:
        # Fuzzy match on student name
        students = Student.objects.filter(status='Active')

        # Filter by school if provided
        if school_id:
            students = students.filter(school_id=school_id)
        elif school_name:
            resolved_school_id, err = self._resolve_school(school_name)
            if err:
                return None, err, None
            if resolved_school_id:
                students = students.filter(school_id=resolved_school_id)

        # Filter by class if provided
        if student_class:
            students = students.filter(
                Q(student_class__icontains=student_class) |
                Q(student_class__iexact=student_class)
            )

        # Find matching students
        matches = []
        for student in students:
            score = fuzzy_match_score(student_name, student.name)
            if score >= 0.6:
                matches.append((student, score))

        matches.sort(key=lambda x: x[1], reverse=True)

        if not matches:
            return None, f"No student found matching '{student_name}'", None

        if len(matches) > 1 and matches[0][1] < 0.85:
            # Multiple possible matches
            match_info = [f"{m[0].name} ({m[0].student_class})" for m in matches[:3]]
            return None, f"Multiple students match '{student_name}': {', '.join(match_info)}. Please be more specific (add class or school).", None

        student = matches[0][0]
    else:
        return None, "Need either fee_id, student_id, or student_name to find the fee", None

    # Now find the fee for this student
    if student_id:
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return None, f"Student #{student_id} not found", None

    # Find fee - Fee uses student_id as integer, not FK
    fees = Fee.objects.select_related('school').filter(student_id=student.id, month=month)

    if not fees.exists():
        # Try without month - get most recent pending fee
        # Fee model doesn't have created_at, use id instead
        fees = Fee.objects.select_related('school').filter(
            student_id=student.id,
            status__in=['Pending', 'Partial']
        ).order_by('-id')

        if not fees.exists():
            return None, f"No pending fee found for {student.name}. Try specifying a month.", None

        fee = fees.first()
        return fee.id, None, {
            'student_name': student.name,
            'school': student.school.name if student.school else 'Unknown',
            'month': fee.month,
            'current_paid': float(fee.paid_amount),
            'total_fee': float(fee.total_fee),
            'balance': float(fee.balance_due)
        }

    fee = fees.first()
    return fee.id, None, {
        'student_name': student.name,
        'school': student.school.name if student.school else 'Unknown',
        'month': fee.month,
        'current_paid': float(fee.paid_amount),
        'total_fee': float(fee.total_fee),
        'balance': float(fee.balance_due)
    }


class ParameterResolver:
    """
    Resolves AI action parameters by looking up fuzzy/alternative values.
    """

    def __init__(self, context: Dict[str, Any] = None):
        self.context = context or {}

    def _get_accessible_school_ids(self) -> list:
        """Get the list of school IDs the user can access (None for admins, list for teachers)."""
        return self.context.get('_accessible_school_ids')

    def _get_accessible_schools_queryset(self):
        """Get queryset of schools the user can access."""
        from students.models import School
        accessible_ids = self._get_accessible_school_ids()
        if accessible_ids is not None:
            return School.objects.filter(is_active=True, id__in=accessible_ids)
        return School.objects.filter(is_active=True)

    def _resolve_school(self, school_name: str) -> Tuple[Optional[int], Optional[str]]:
        """Resolve school name with user's access restrictions."""
        return resolve_school_from_db(school_name, self._get_accessible_school_ids())

    def resolve(self, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolve parameters for an action.

        Returns:
            {
                "success": bool,
                "params": dict (resolved params),
                "clarify": str (if needs clarification),
                "info": dict (additional info like matched names)
            }
        """
        if action_name == 'CREATE_MONTHLY_FEES':
            return self._resolve_create_monthly_fees(params)

        if action_name == 'CREATE_SINGLE_FEE':
            return self._resolve_create_single_fee(params)

        if action_name == 'UPDATE_FEE':
            return self._resolve_update_fee(params)

        if action_name == 'DELETE_FEES':
            return self._resolve_delete_fees(params)

        if action_name == 'GET_FEES':
            return self._resolve_get_fees(params)

        if action_name == 'GET_FEE_SUMMARY':
            return self._resolve_get_fees(params)  # Same resolution

        if action_name == 'BULK_UPDATE_FEES':
            return self._resolve_bulk_update_fees(params)

        if action_name == 'CREATE_MISSING_FEES':
            return self._resolve_create_missing_fees(params)

        # Inventory actions that need item resolution
        if action_name in ['TRANSFER_ITEM', 'ASSIGN_ITEM', 'EDIT_ITEM',
                          'UPDATE_ITEM_STATUS', 'GET_ITEM_DETAILS', 'DELETE_ITEM']:
            return self._resolve_inventory_item(params, action_name)

        if action_name == 'BULK_DELETE_ITEMS':
            return self._resolve_bulk_inventory_items(params)

        if action_name == 'CREATE_ITEM':
            return self._resolve_create_item(params)

        # Category actions
        if action_name in ['UPDATE_CATEGORY', 'DELETE_CATEGORY']:
            return self._resolve_category(params, action_name)

        # Task agent actions
        if action_name == 'CREATE_TASK':
            return self._resolve_create_task(params)

        # No resolution needed
        return {
            "success": True,
            "params": params
        }

    def _resolve_create_monthly_fees(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve school for CREATE_MONTHLY_FEES."""
        from students.models import School

        # Need school_id or school_name
        if not params.get('school_id') and not params.get('school_name'):
            # Generate school list for better UX (filtered by user's access)
            schools = list(self._get_accessible_schools_queryset().order_by('name')[:10])
            if schools:
                numbered_list = "\n".join([f"  {i+1}. {s.name}" for i, s in enumerate(schools)])
                return {
                    "success": False,
                    "clarify": f"Which school do you want to create fees for?\n\nAvailable schools:\n{numbered_list}\n\nReply with the number to select, or say 'all schools'."
                }
            return {
                "success": False,
                "clarify": "Which school do you want to create fees for? Or say 'all schools' to create for every school."
            }

        if params.get('school_name') and not params.get('school_id'):
            school_id, error = self._resolve_school(params['school_name'])
            if error:
                return {
                    "success": False,
                    "clarify": error
                }
            params['school_id'] = school_id

        return {
            "success": True,
            "params": params
        }

    def _resolve_update_fee(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve fee for UPDATE_FEE."""
        # Need at least one update field
        if not params.get('paid_amount') and not params.get('date_received') and not params.get('total_fee'):
            return {
                "success": False,
                "clarify": "What would you like to update? You can:\n- Record a payment amount\n- Set the date received\n- Change the total fee amount"
            }

        fee_id, error, fee_info = resolve_fee_for_update(params)

        if error:
            return {
                "success": False,
                "clarify": error
            }

        params['fee_id'] = fee_id

        return {
            "success": True,
            "params": params,
            "info": fee_info
        }

    def _resolve_get_fees(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve school and student for GET_FEES."""
        from students.models import Student

        # Resolve school_name to school_id
        if params.get('school_name') and not params.get('school_id'):
            school_id, error = self._resolve_school(params['school_name'])
            if error:
                return {
                    "success": False,
                    "clarify": error
                }
            params['school_id'] = school_id

        # Resolve student_name to student_id
        if params.get('student_name') and not params.get('student_id'):
            student_name = params['student_name']
            students = Student.objects.filter(status='Active')

            # Filter by school if provided
            if params.get('school_id'):
                students = students.filter(school_id=params['school_id'])

            # Fuzzy match on student name
            matches = []
            for student in students:
                score = fuzzy_match_score(student_name, student.name)
                if score >= 0.6:
                    matches.append((student, score))

            matches.sort(key=lambda x: x[1], reverse=True)

            if not matches:
                return {
                    "success": False,
                    "clarify": f"No student found matching '{student_name}'."
                }

            if len(matches) > 1 and matches[0][1] < 0.85:
                match_info = [f"{m[0].name} ({m[0].student_class})" for m in matches[:3]]
                return {
                    "success": False,
                    "clarify": f"Multiple students match '{student_name}': {', '.join(match_info)}. Please be more specific."
                }

            params['student_id'] = matches[0][0].id

        return {
            "success": True,
            "params": params
        }

    def _resolve_create_single_fee(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve student for CREATE_SINGLE_FEE."""
        from students.models import Student
        from django.db.models import Q

        student_name = params.get('student_name')
        student_id = params.get('student_id')
        school_name = params.get('school_name')
        school_id = params.get('school_id')
        student_class = params.get('class')

        # If student_id provided, validate it exists
        if student_id:
            try:
                student = Student.objects.get(id=student_id, status='Active')
                params['student_id'] = student.id
                return {
                    "success": True,
                    "params": params,
                    "info": {"student_name": student.name, "school": student.school.name}
                }
            except Student.DoesNotExist:
                return {
                    "success": False,
                    "clarify": f"Student #{student_id} not found or not active."
                }

        # Need student_name to find the student
        if not student_name:
            return {
                "success": False,
                "clarify": "Which student do you want to create a fee for? Please provide the student name."
            }

        # Build student query
        students = Student.objects.filter(status='Active')

        # Filter by school if provided
        if school_id:
            students = students.filter(school_id=school_id)
        elif school_name:
            resolved_school_id, err = self._resolve_school(school_name)
            if err:
                return {"success": False, "clarify": err}
            if resolved_school_id:
                students = students.filter(school_id=resolved_school_id)
                params['school_id'] = resolved_school_id

        # Filter by class if provided
        if student_class:
            students = students.filter(
                Q(student_class__icontains=student_class) |
                Q(student_class__iexact=student_class)
            )

        # Fuzzy match on student name
        matches = []
        for student in students:
            score = fuzzy_match_score(student_name, student.name)
            if score >= 0.6:
                matches.append((student, score))

        matches.sort(key=lambda x: x[1], reverse=True)

        if not matches:
            return {
                "success": False,
                "clarify": f"No student found matching '{student_name}'. Please check the name or specify school/class."
            }

        if len(matches) > 1 and matches[0][1] < 0.85:
            # Multiple possible matches - ask for clarification
            match_list = [f"  {i+1}. {m[0].name} ({m[0].student_class}, {m[0].school.name})" for i, m in enumerate(matches[:5])]
            return {
                "success": False,
                "clarify": f"Multiple students match '{student_name}':\n" + "\n".join(match_list) + "\n\nPlease specify the school or class to narrow down."
            }

        # Found exact or close match
        student = matches[0][0]
        params['student_id'] = student.id

        return {
            "success": True,
            "params": params,
            "info": {
                "student_name": student.name,
                "school": student.school.name,
                "class": student.student_class
            }
        }

    def _resolve_delete_fees(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve fee(s) for DELETE_FEES."""
        from students.models import Fee, Student
        from django.db.models import Q

        fee_ids = params.get('fee_ids', [])
        student_name = params.get('student_name')
        month = params.get('month')

        # If fee_ids provided, validate they exist
        if fee_ids:
            if isinstance(fee_ids, int):
                fee_ids = [fee_ids]

            existing_fees = Fee.objects.filter(id__in=fee_ids)
            if not existing_fees.exists():
                return {
                    "success": False,
                    "clarify": f"No fees found with IDs: {fee_ids}"
                }

            # Return fee details for confirmation
            # Fee model has student_name directly
            fee_details = [
                f"  • Fee #{f.id}: {f.student_name} - {f.month} - PKR {f.total_fee:,.0f}"
                for f in existing_fees
            ]
            params['fee_ids'] = list(existing_fees.values_list('id', flat=True))

            return {
                "success": True,
                "params": params,
                "info": {
                    "fees_to_delete": fee_details,
                    "count": existing_fees.count()
                }
            }

        # Find fees by student name
        if student_name:
            students = Student.objects.filter(status='Active')

            # Fuzzy match on student name
            matches = []
            for student in students:
                score = fuzzy_match_score(student_name, student.name)
                if score >= 0.6:
                    matches.append((student, score))

            matches.sort(key=lambda x: x[1], reverse=True)

            if not matches:
                return {
                    "success": False,
                    "clarify": f"No student found matching '{student_name}'."
                }

            if len(matches) > 1 and matches[0][1] < 0.85:
                match_info = [f"{m[0].name} ({m[0].student_class})" for m in matches[:3]]
                return {
                    "success": False,
                    "clarify": f"Multiple students match '{student_name}': {', '.join(match_info)}. Please be more specific."
                }

            student = matches[0][0]

            # Find fees for this student - Fee uses student_id as integer, not FK
            fees = Fee.objects.filter(student_id=student.id)
            if month:
                fees = fees.filter(month=month)

            if not fees.exists():
                return {
                    "success": False,
                    "clarify": f"No fee records found for {student.name}" + (f" for {month}" if month else "") + "."
                }

            # Return fee details for confirmation
            fee_details = [
                f"  • Fee #{f.id}: {f.month} - PKR {f.total_fee:,.0f} (Paid: PKR {f.paid_amount:,.0f})"
                for f in fees[:10]
            ]
            params['fee_ids'] = list(fees.values_list('id', flat=True))

            return {
                "success": True,
                "params": params,
                "info": {
                    "student_name": student.name,
                    "fees_to_delete": fee_details,
                    "count": fees.count()
                }
            }

        return {
            "success": False,
            "clarify": "Please specify which fee to delete. You can say 'delete fee #123' or 'delete fee for [student name]'."
        }

    def _resolve_bulk_update_fees(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve fees for BULK_UPDATE_FEES."""
        from students.models import Fee, Student
        from django.db.models import Q

        fee_ids = params.get('fee_ids', [])
        school_name = params.get('school_name')
        school_id = params.get('school_id')
        student_class = params.get('class')
        month = params.get('month')
        status = params.get('status')
        paid_amount = params.get('paid_amount')

        # Need either fee_ids OR filter criteria
        if not fee_ids and not school_id and not school_name and not student_class:
            return {
                "success": False,
                "clarify": "Which fees do you want to update? Please specify:\n- Fee IDs (e.g., 'fees 1, 2, 3')\n- OR school/class filter (e.g., 'all fees for class 10A')"
            }

        # Need paid_amount
        if not paid_amount:
            return {
                "success": False,
                "clarify": "What payment amount should I apply? You can say:\n- A specific amount (e.g., '5000')\n- 'full' to mark as fully paid\n- 'balance' to pay remaining amount"
            }

        # If fee_ids provided, validate they exist
        if fee_ids:
            if isinstance(fee_ids, int):
                fee_ids = [fee_ids]

            existing_fees = Fee.objects.filter(id__in=fee_ids)
            if not existing_fees.exists():
                return {
                    "success": False,
                    "clarify": f"No fees found with IDs: {fee_ids}"
                }

            params['fee_ids'] = list(existing_fees.values_list('id', flat=True))
            return {
                "success": True,
                "params": params,
                "info": {
                    "fees_count": existing_fees.count()
                }
            }

        # Build fee query from filter criteria
        fees = Fee.objects.all()

        # Resolve school
        if school_name and not school_id:
            resolved_school_id, err = self._resolve_school(school_name)
            if err:
                return {"success": False, "clarify": err}
            school_id = resolved_school_id

        if school_id:
            fees = fees.filter(school_id=school_id)

        if student_class:
            # Fee model has student_class field directly (not FK to Student)
            fees = fees.filter(
                Q(student_class__icontains=student_class) |
                Q(student_class__iexact=student_class)
            )

        if month:
            fees = fees.filter(month=month)

        if status:
            fees = fees.filter(status=status)
        else:
            # Default: only update Pending or Partial fees
            fees = fees.filter(status__in=['Pending', 'Partial'])

        fees_count = fees.count()
        if fees_count == 0:
            return {
                "success": False,
                "clarify": "No matching fees found with those criteria."
            }

        # Store the resolved fee_ids
        params['fee_ids'] = list(fees.values_list('id', flat=True)[:100])  # Limit to 100 at a time
        params['school_id'] = school_id

        # Add preview data for confirmation modal
        params['_preview_fees_count'] = min(fees_count, 100)
        if school_id:
            try:
                from students.models import School
                school = School.objects.get(id=school_id)
                params['_preview_school_name'] = school.name
            except School.DoesNotExist:
                pass

        return {
            "success": True,
            "params": params,
            "info": {
                "fees_count": fees_count,
                "truncated": fees_count > 100
            }
        }

    def _resolve_create_missing_fees(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve and gather preview data for CREATE_MISSING_FEES."""
        from students.models import School, Fee, Student

        month = params.get('month')
        school_id = params.get('school_id')
        school_name = params.get('school_name')

        # Resolve school_name to school_id if provided
        if school_name and not school_id:
            resolved_school_id, err = self._resolve_school(school_name)
            if err:
                return {"success": False, "clarify": err}
            school_id = resolved_school_id
            params['school_id'] = school_id

        # Get schools to check (filtered by user's access)
        all_schools = self._get_accessible_schools_queryset()
        if school_id:
            all_schools = all_schools.filter(id=school_id)

        # Find which schools have fees for this month
        schools_with_fees_ids = set(
            Fee.objects.filter(month=month).values_list('school_id', flat=True).distinct()
        )

        # PART 1: Schools without any fees
        schools_without_fees = [s for s in all_schools if s.id not in schools_with_fees_ids]
        schools_count = len(schools_without_fees)

        # PART 2: Students WITHOUT fee records in schools that DO have fees
        students_count = 0
        schools_with_fees = [s for s in all_schools if s.id in schools_with_fees_ids]

        for school in schools_with_fees:
            active_students = Student.objects.filter(school=school, status='Active')
            students_with_fees = set(
                Fee.objects.filter(school=school, month=month).values_list('student_id', flat=True)
            )
            students_without_fees = [s for s in active_students if s.id not in students_with_fees]
            students_count += len(students_without_fees)

        # Add preview data for confirmation modal
        params['_preview_schools_count'] = schools_count
        params['_preview_students_count'] = students_count

        if schools_count == 0 and students_count == 0:
            return {
                "success": False,
                "clarify": f"All schools and students already have fee records for {month}. Nothing to create."
            }

        return {
            "success": True,
            "params": params,
            "info": {
                "schools_count": schools_count,
                "students_count": students_count
            }
        }


    def _resolve_inventory_item(self, params: Dict[str, Any], action_name: str) -> Dict[str, Any]:
        """
        Resolve inventory item from various parameters.

        Supports:
        - Direct item_id
        - item_name (fuzzy match)
        - category + school combination
        - assigned_to (user name)
        """
        from inventory.models import InventoryItem, InventoryCategory
        from students.models import School
        from django.contrib.auth import get_user_model
        from django.db.models import Q

        User = get_user_model()

        # If item_id already provided, validate it exists
        if params.get('item_id'):
            try:
                item = InventoryItem.objects.select_related('school', 'category', 'assigned_to').get(id=params['item_id'])
                return {
                    "success": True,
                    "params": params,
                    "info": {
                        "item_name": item.name,
                        "unique_id": item.unique_id,
                        "school": item.school.name if item.school else None,
                        "category": item.category.name if item.category else None
                    }
                }
            except InventoryItem.DoesNotExist:
                return {
                    "success": False,
                    "clarify": f"Item #{params['item_id']} not found."
                }

        # Gather search criteria
        item_name = params.get('item_name')
        category_name = params.get('category_name') or params.get('category')
        category_id = params.get('category_id')
        school_name = params.get('school_name')
        school_id = params.get('school_id')
        assigned_to_name = params.get('assigned_to_name') or params.get('assigned_to')
        assigned_to_id = params.get('assigned_to_id')

        # Build query
        items = InventoryItem.objects.select_related('school', 'category', 'assigned_to')

        # Filter by school
        if school_id:
            items = items.filter(school_id=school_id)
        elif school_name:
            resolved_school_id, err = self._resolve_school(school_name)
            if err:
                return {"success": False, "clarify": err}
            if resolved_school_id:
                items = items.filter(school_id=resolved_school_id)
                params['school_id'] = resolved_school_id

        # Filter by category
        if category_id:
            items = items.filter(category_id=category_id)
        elif category_name:
            # Fuzzy match category
            categories = InventoryCategory.objects.all()
            cat_matches = []
            for cat in categories:
                score = fuzzy_match_score(str(category_name), cat.name)
                if score >= 0.6:
                    cat_matches.append((cat, score))
            cat_matches.sort(key=lambda x: x[1], reverse=True)

            if cat_matches:
                items = items.filter(category_id=cat_matches[0][0].id)
            else:
                return {
                    "success": False,
                    "clarify": f"No category found matching '{category_name}'."
                }

        # Filter by assigned user
        if assigned_to_id:
            items = items.filter(assigned_to_id=assigned_to_id)
        elif assigned_to_name:
            # Fuzzy match user name
            users = User.objects.all()
            user_matches = []
            for user in users:
                full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                score = fuzzy_match_score(str(assigned_to_name), full_name)
                if score >= 0.6:
                    user_matches.append((user, score))
            user_matches.sort(key=lambda x: x[1], reverse=True)

            if user_matches:
                items = items.filter(assigned_to_id=user_matches[0][0].id)
            else:
                return {
                    "success": False,
                    "clarify": f"No user found matching '{assigned_to_name}'."
                }

        # If item_name provided, fuzzy match
        if item_name:
            matches = []
            for item in items:
                score = fuzzy_match_score(item_name, item.name)
                if score >= 0.5:  # Lower threshold for item names
                    matches.append((item, score))

            matches.sort(key=lambda x: x[1], reverse=True)

            if not matches:
                return {
                    "success": False,
                    "clarify": f"No item found matching '{item_name}'." +
                              (f" Try specifying category or school." if not (category_name or school_name) else "")
                }

            if len(matches) == 1 or (matches[0][1] > 0.85):
                # Single match or clear winner
                item = matches[0][0]
                params['item_id'] = item.id
                return {
                    "success": True,
                    "params": params,
                    "info": {
                        "item_name": item.name,
                        "unique_id": item.unique_id,
                        "school": item.school.name if item.school else None,
                        "category": item.category.name if item.category else None
                    }
                }

            # Multiple matches - show list for selection
            match_list = []
            for i, (item, score) in enumerate(matches[:8]):
                location = item.school.name if item.school else item.location
                assignee = ""
                if item.assigned_to:
                    assignee = f" → {item.assigned_to.first_name} {item.assigned_to.last_name}".strip()
                match_list.append(f"  {i+1}. {item.name} ({item.unique_id}) at {location}{assignee}")

            return {
                "success": False,
                "clarify": f"Multiple items match '{item_name}':\n" + "\n".join(match_list) +
                          "\n\nPlease specify more details (school, category, or person assigned)."
            }

        # No item_name but we have other filters - check what we found
        item_count = items.count()

        if item_count == 0:
            filters_used = []
            if school_name or school_id:
                filters_used.append("school")
            if category_name or category_id:
                filters_used.append("category")
            if assigned_to_name or assigned_to_id:
                filters_used.append("assigned person")

            return {
                "success": False,
                "clarify": f"No items found" + (f" matching {', '.join(filters_used)}" if filters_used else "") +
                          ". Please provide the item name or check your filters."
            }

        if item_count == 1:
            item = items.first()
            params['item_id'] = item.id
            return {
                "success": True,
                "params": params,
                "info": {
                    "item_name": item.name,
                    "unique_id": item.unique_id,
                    "school": item.school.name if item.school else None,
                    "category": item.category.name if item.category else None
                }
            }

        # Multiple items found - show list
        match_list = []
        for i, item in enumerate(items[:8]):
            location = item.school.name if item.school else item.location
            category = item.category.name if item.category else "Uncategorized"
            match_list.append(f"  {i+1}. {item.name} ({category}) at {location}")

        return {
            "success": False,
            "clarify": f"Found {item_count} items. Which one?\n" + "\n".join(match_list) +
                      "\n\nPlease specify the item name."
        }

    def _resolve_bulk_inventory_items(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve multiple inventory items for bulk operations."""
        from inventory.models import InventoryItem

        item_ids = params.get('item_ids', [])

        # If item_ids provided, validate they exist
        if item_ids:
            if isinstance(item_ids, int):
                item_ids = [item_ids]

            existing_items = InventoryItem.objects.filter(id__in=item_ids)
            if not existing_items.exists():
                return {
                    "success": False,
                    "clarify": f"No items found with IDs: {item_ids}"
                }

            # Return item details for confirmation
            item_details = [
                f"  • {item.name} ({item.unique_id}) - {item.status}"
                for item in existing_items
            ]
            params['item_ids'] = list(existing_items.values_list('id', flat=True))

            return {
                "success": True,
                "params": params,
                "info": {
                    "items_to_delete": item_details,
                    "count": existing_items.count()
                }
            }

        return {
            "success": False,
            "clarify": "Please specify which items to delete. You can say 'delete items 1, 2, 3' or use filters like 'delete all damaged items at Main School'."
        }

    def _resolve_create_item(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve parameters for CREATE_ITEM."""
        from students.models import School
        from inventory.models import InventoryCategory
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Required: name and purchase_value
        if not params.get('name'):
            return {
                "success": False,
                "clarify": "What is the name of the item you want to add?"
            }

        if not params.get('purchase_value'):
            return {
                "success": False,
                "clarify": f"What is the purchase value of '{params['name']}'? (e.g., 50000 PKR)"
            }

        # Resolve school_name to school_id
        if params.get('school_name') and not params.get('school_id'):
            school_id, error = self._resolve_school(params['school_name'])
            if error:
                return {"success": False, "clarify": error}
            params['school_id'] = school_id

        # Resolve category_name to category_id
        if params.get('category_name') and not params.get('category_id'):
            categories = InventoryCategory.objects.all()
            cat_matches = []
            for cat in categories:
                score = fuzzy_match_score(params['category_name'], cat.name)
                if score >= 0.6:
                    cat_matches.append((cat, score))
            cat_matches.sort(key=lambda x: x[1], reverse=True)

            if cat_matches:
                params['category_id'] = cat_matches[0][0].id
            else:
                # Category doesn't exist - ask if they want to create or pick existing
                existing_cats = ", ".join([c.name for c in categories[:5]])
                return {
                    "success": False,
                    "clarify": f"Category '{params['category_name']}' not found. Available: {existing_cats}"
                }

        # Resolve assigned_to_name to assigned_to_id
        if params.get('assigned_to_name') and not params.get('assigned_to_id'):
            users = User.objects.all()
            user_matches = []
            for user in users:
                full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                score = fuzzy_match_score(params['assigned_to_name'], full_name)
                if score >= 0.6:
                    user_matches.append((user, score))
            user_matches.sort(key=lambda x: x[1], reverse=True)

            if user_matches:
                params['assigned_to_id'] = user_matches[0][0].id
            else:
                return {
                    "success": False,
                    "clarify": f"User '{params['assigned_to_name']}' not found."
                }

        return {
            "success": True,
            "params": params
        }

    def _resolve_category(self, params: Dict[str, Any], action_name: str) -> Dict[str, Any]:
        """Resolve category for UPDATE_CATEGORY or DELETE_CATEGORY."""
        from inventory.models import InventoryCategory

        # If category_id provided, validate it exists
        if params.get('category_id'):
            try:
                category = InventoryCategory.objects.get(id=params['category_id'])
                return {
                    "success": True,
                    "params": params,
                    "info": {"category_name": category.name}
                }
            except InventoryCategory.DoesNotExist:
                return {
                    "success": False,
                    "clarify": f"Category #{params['category_id']} not found."
                }

        # Resolve by category_name
        category_name = params.get('category_name')
        if not category_name:
            categories = InventoryCategory.objects.all()[:10]
            cat_list = ", ".join([c.name for c in categories])
            return {
                "success": False,
                "clarify": f"Which category? Available: {cat_list}"
            }

        # Fuzzy match
        categories = InventoryCategory.objects.all()
        matches = []
        for cat in categories:
            score = fuzzy_match_score(category_name, cat.name)
            if score >= 0.6:
                matches.append((cat, score))

        matches.sort(key=lambda x: x[1], reverse=True)

        if not matches:
            cat_list = ", ".join([c.name for c in categories[:5]])
            return {
                "success": False,
                "clarify": f"No category found matching '{category_name}'. Available: {cat_list}"
            }

        if len(matches) == 1 or matches[0][1] > 0.85:
            params['category_id'] = matches[0][0].id
            return {
                "success": True,
                "params": params,
                "info": {"category_name": matches[0][0].name}
            }

        # Multiple matches
        match_names = [m[0].name for m in matches[:3]]
        return {
            "success": False,
            "clarify": f"Multiple categories match '{category_name}': {', '.join(match_names)}. Please be more specific."
        }

    def _resolve_create_task(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve employee for CREATE_TASK action."""
        from datetime import datetime, date
        import re

        employee_name = params.get('employee_name')
        task_description = params.get('task_description')
        due_date = params.get('due_date')

        # Need employee name
        if not employee_name:
            return {
                "success": False,
                "clarify": "Who should this task be assigned to? Please provide the employee name."
            }

        # Need task description
        if not task_description:
            return {
                "success": False,
                "clarify": "What should the task description be?"
            }

        # Need due date
        if not due_date:
            return {
                "success": False,
                "clarify": "When should this task be completed? Please provide a due date (e.g., 'Friday', 'next Monday', 'Jan 30')."
            }

        # Resolve employee name
        employee_id, error, employee_info = resolve_employee(employee_name)

        if error:
            return {
                "success": False,
                "clarify": error
            }

        params['employee_id'] = employee_id

        # Parse relative dates
        due_date_parsed = self._parse_relative_date(due_date)
        if due_date_parsed:
            params['due_date'] = due_date_parsed

        return {
            "success": True,
            "params": params,
            "info": employee_info
        }

    def _parse_relative_date(self, date_str: str) -> str:
        """Parse relative date strings like 'Friday', 'next Monday', 'tomorrow'."""
        from datetime import datetime, timedelta
        import re

        date_str = date_str.lower().strip()
        today = datetime.now()

        # Already in YYYY-MM-DD format
        if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
            return date_str

        # Parse common relative terms
        if date_str == 'today':
            return today.strftime('%Y-%m-%d')

        if date_str == 'tomorrow':
            return (today + timedelta(days=1)).strftime('%Y-%m-%d')

        # Day names
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for i, day in enumerate(days):
            if day in date_str:
                current_day = today.weekday()
                days_ahead = i - current_day
                if days_ahead <= 0:  # Target day already happened this week
                    days_ahead += 7
                if 'next' in date_str:
                    days_ahead += 7
                target = today + timedelta(days=days_ahead)
                return target.strftime('%Y-%m-%d')

        # Month day format (e.g., "Jan 30", "January 30")
        months = {
            'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
            'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
            'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
            'nov': 11, 'november': 11, 'dec': 12, 'december': 12
        }
        for month_name, month_num in months.items():
            if month_name in date_str:
                day_match = re.search(r'\d+', date_str)
                if day_match:
                    day = int(day_match.group())
                    year = today.year
                    if month_num < today.month or (month_num == today.month and day < today.day):
                        year += 1
                    try:
                        target = datetime(year, month_num, day)
                        return target.strftime('%Y-%m-%d')
                    except ValueError:
                        pass

        # "in X days"
        days_match = re.search(r'in\s+(\d+)\s+days?', date_str)
        if days_match:
            days = int(days_match.group(1))
            return (today + timedelta(days=days)).strftime('%Y-%m-%d')

        # "next week"
        if 'next week' in date_str:
            return (today + timedelta(days=7)).strftime('%Y-%m-%d')

        # Return as-is if can't parse (let the executor handle it)
        return date_str


def resolve_employee(employee_name: str) -> Tuple[Optional[int], Optional[str], Optional[Dict]]:
    """
    Fuzzy match employee_name against database employees (Teachers, Admins, BDMs).

    Args:
        employee_name: The name or number to resolve

    Returns:
        (employee_id, error_message, employee_info)
        - If resolved: (id, None, {name, employee_id, role})
        - If ambiguous: (None, "Multiple matches: ...", None)
        - If not found: (None, "Employee not found", None)
    """
    from django.contrib.auth import get_user_model
    import logging
    logger = logging.getLogger(__name__)

    User = get_user_model()

    # Get all active employees (Teachers, Admins, BDMs)
    employees = User.objects.filter(
        role__in=['Teacher', 'Admin', 'BDM'],
        is_active=True
    ).select_related('teacher_profile')

    employee_name_clean = employee_name.strip()

    # Check if input contains role clarification (e.g., "Ahmed (Teacher)" or "Ahmed the admin")
    role_in_name = None
    name_only = employee_name_clean

    # Check for pattern like "Name (Role)" or "Name - Role"
    import re
    role_pattern = re.match(r'^(.+?)\s*[\(\-]\s*(teacher|admin|bdm)\s*[\)]?\s*$', employee_name_clean, re.IGNORECASE)
    if role_pattern:
        name_only = role_pattern.group(1).strip()
        role_in_name = role_pattern.group(2).upper() if role_pattern.group(2).lower() == 'bdm' else role_pattern.group(2).capitalize()
        logger.info(f"Detected role clarification: name='{name_only}', role='{role_in_name}'")

    # Also check for "Name the teacher" or "Name who is admin"
    role_suffix = re.match(r'^(.+?)\s+(?:the|who\s+is\s+(?:a|an)?)\s*(teacher|admin|bdm)\s*$', employee_name_clean, re.IGNORECASE)
    if role_suffix:
        name_only = role_suffix.group(1).strip()
        role_in_name = role_suffix.group(2).upper() if role_suffix.group(2).lower() == 'bdm' else role_suffix.group(2).capitalize()
        logger.info(f"Detected role suffix: name='{name_only}', role='{role_in_name}'")

    logger.info(f"Resolving employee name '{name_only}' from {employees.count()} employees")

    # Fuzzy match
    matches = []
    for emp in employees:
        full_name = emp.get_full_name() or emp.username
        score = fuzzy_match_score(name_only, full_name)
        # Also check username
        username_score = fuzzy_match_score(name_only, emp.username)
        # Check first name only
        first_name_score = fuzzy_match_score(name_only, emp.first_name) if emp.first_name else 0
        best_score = max(score, username_score, first_name_score)

        if best_score >= 0.5:
            matches.append((emp, best_score))

    matches.sort(key=lambda x: x[1], reverse=True)
    logger.info(f"Found {len(matches)} matches for '{name_only}'")

    # If role was specified, filter matches by role
    if role_in_name and matches:
        role_filtered = [(emp, score) for emp, score in matches if emp.role == role_in_name]
        if len(role_filtered) == 1:
            # Role clarification resolved the ambiguity
            emp = role_filtered[0][0]
            full_name = emp.get_full_name() or emp.username
            employee_id_str = getattr(emp.teacher_profile, 'employee_id', None) if hasattr(emp, 'teacher_profile') else None
            logger.info(f"Role clarification resolved to: {full_name} (ID: {emp.id})")
            return emp.id, None, {
                'name': full_name,
                'employee_id': employee_id_str,
                'role': emp.role
            }
        elif role_filtered:
            # Multiple matches even with role filter - use filtered list
            matches = role_filtered

    if not matches:
        # No matches found - ask for full name
        return None, f"I couldn't find anyone named '{name_only}'. Please provide the employee's full name.", None

    # Check for multiple high-scoring matches (people with same/similar names)
    high_score_matches = [m for m in matches if m[1] >= 0.8]

    if len(matches) == 1:
        # Single match - use it
        emp = matches[0][0]
        full_name = emp.get_full_name() or emp.username
        employee_id_str = getattr(emp.teacher_profile, 'employee_id', None) if hasattr(emp, 'teacher_profile') else None
        logger.info(f"Best match: {full_name} (ID: {emp.id}, score: {matches[0][1]})")
        return emp.id, None, {
            'name': full_name,
            'employee_id': employee_id_str,
            'role': emp.role
        }

    # If multiple high-scoring matches exist, need clarification even if top score > 0.85
    if len(high_score_matches) > 1:
        # Multiple people with similar names - check their roles
        roles_in_high_matches = set(emp.role for emp, _ in high_score_matches)

        if len(roles_in_high_matches) > 1:
            # Different roles - ask for role clarification
            match_details = []
            for emp, score in high_score_matches[:4]:
                full_name = emp.get_full_name() or emp.username
                match_details.append(f"  - {full_name} ({emp.role})")

            clarification = f"I found multiple people named '{name_only}':\n"
            clarification += "\n".join(match_details)
            clarification += "\n\nWhich one? Please specify the role, e.g., \"{} (Teacher)\" or \"{} the BDM\"".format(name_only, name_only)

            return None, clarification, None
        else:
            # Same role - ask for more details
            match_details = []
            for emp, score in high_score_matches[:4]:
                full_name = emp.get_full_name() or emp.username
                match_details.append(f"  - {full_name}")

            clarification = f"I found multiple {high_score_matches[0][0].role}s matching '{name_only}':\n"
            clarification += "\n".join(match_details)
            clarification += "\n\nPlease provide more details to specify which one."

            return None, clarification, None

    # Single high-scoring match or clear winner (top score much higher than others)
    if matches[0][1] > 0.85:
        emp = matches[0][0]
        full_name = emp.get_full_name() or emp.username
        employee_id_str = getattr(emp.teacher_profile, 'employee_id', None) if hasattr(emp, 'teacher_profile') else None
        logger.info(f"Best match: {full_name} (ID: {emp.id}, score: {matches[0][1]})")
        return emp.id, None, {
            'name': full_name,
            'employee_id': employee_id_str,
            'role': emp.role
        }

    # Multiple close matches - check if they have different roles
    roles_in_matches = set(emp.role for emp, _ in matches)

    if len(roles_in_matches) > 1:
        # Different roles - ask for role clarification
        match_details = []
        for emp, score in matches[:4]:
            full_name = emp.get_full_name() or emp.username
            match_details.append(f"  - {full_name} ({emp.role})")

        clarification = f"I found multiple people named '{name_only}':\n"
        clarification += "\n".join(match_details)
        clarification += "\n\nWhich one? Please specify the role, e.g., \"{} (Teacher)\" or \"{} the Admin\"".format(name_only, name_only)

        return None, clarification, None
    else:
        # Same role - ask for full name
        match_details = []
        for emp, score in matches[:4]:
            full_name = emp.get_full_name() or emp.username
            match_details.append(f"  - {full_name}")

        clarification = f"I found multiple {matches[0][0].role}s matching '{name_only}':\n"
        clarification += "\n".join(match_details)
        clarification += "\n\nPlease provide the full name to specify which one."

        return None, clarification, None


def get_resolver(context: Dict[str, Any] = None) -> ParameterResolver:
    """Get parameter resolver instance."""
    return ParameterResolver(context)
