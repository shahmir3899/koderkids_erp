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


def resolve_school_from_db(school_name: str) -> Tuple[Optional[int], Optional[str]]:
    """
    Resolve school from database using fuzzy matching.

    Returns:
        (school_id, error_message)
    """
    from students.models import School
    import logging
    logger = logging.getLogger(__name__)

    # Check if input is a number (user selecting from previous list)
    if school_name.strip().isdigit():
        selection = int(school_name.strip())
        schools = list(School.objects.filter(is_active=True).order_by('name')[:10])
        if 1 <= selection <= len(schools):
            selected = schools[selection - 1]
            logger.info(f"User selected #{selection}: {selected.name} (ID: {selected.id})")
            return selected.id, None
        else:
            return None, f"Invalid selection. Please enter a number between 1 and {len(schools)}."

    schools = School.objects.filter(is_active=True)
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
        # Show all schools with numbers for selection
        all_schools = list(School.objects.filter(is_active=True).order_by('name')[:10])
        numbered_list = "\n".join([f"  {i+1}. {s.name}" for i, s in enumerate(all_schools)])
        return None, f"No school found matching '{school_name}'. Available schools:\n{numbered_list}\n\nReply with the number to select."

    if len(matches) == 1:
        logger.info(f"Single match: {matches[0][0].name} (ID: {matches[0][0].id})")
        return matches[0][0].id, None

    # If top match is significantly better than others, use it
    if matches[0][1] > 0.85 and matches[0][1] - matches[1][1] > 0.15:
        logger.info(f"Best match: {matches[0][0].name} (ID: {matches[0][0].id}, score: {matches[0][1]})")
        return matches[0][0].id, None

    # Multiple close matches - show ALL schools alphabetically for consistent numbering
    # The number selection logic uses this same order
    all_schools = list(School.objects.filter(is_active=True).order_by('name')[:10])
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
            resolved_school_id, err = resolve_school_from_db(school_name)
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
            resolved_school_id, err = resolve_school_from_db(school_name)
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
            # Generate school list for better UX
            schools = list(School.objects.filter(is_active=True).order_by('name')[:10])
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
            school_id, error = resolve_school_from_db(params['school_name'])
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
            school_id, error = resolve_school_from_db(params['school_name'])
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
            resolved_school_id, err = resolve_school_from_db(school_name)
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
            resolved_school_id, err = resolve_school_from_db(school_name)
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

        return {
            "success": True,
            "params": params,
            "info": {
                "fees_count": fees_count,
                "truncated": fees_count > 100
            }
        }


def get_resolver(context: Dict[str, Any] = None) -> ParameterResolver:
    """Get parameter resolver instance."""
    return ParameterResolver(context)
