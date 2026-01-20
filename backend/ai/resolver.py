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
            fee = Fee.objects.get(id=params['fee_id'])
            return fee.id, None, {
                'student_name': fee.student.name,
                'school': fee.student.school.name,
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

        # Get pending fees for these students
        student_fees = Fee.objects.filter(
            student__in=students,
            status__in=['Pending', 'Partial']
        ).select_related('student').order_by('student__name')[:10]

        if not student_fees.exists():
            return None, f"No pending fees found for students in class {student_class}", None

        # Return list of students with pending fees for user to choose
        fee_list = [f"  {i+1}. {f.student.name} - PKR {f.balance_due:,.0f} pending ({f.month})"
                    for i, f in enumerate(student_fees)]
        return None, f"Which student's fee do you want to update?\n\n" + "\n".join(fee_list) + "\n\nPlease specify the student name.", None

    if student_id:
        student_query &= Q(id=student_id)
    elif student_name:
        # Fuzzy match on student name
        students = Student.objects.filter(is_active=True)

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

    # Find fee
    fees = Fee.objects.filter(student=student, month=month)

    if not fees.exists():
        # Try without month - get most recent pending fee
        fees = Fee.objects.filter(
            student=student,
            status__in=['Pending', 'Partial']
        ).order_by('-created_at')

        if not fees.exists():
            return None, f"No pending fee found for {student.name}. Try specifying a month.", None

        fee = fees.first()
        return fee.id, None, {
            'student_name': student.name,
            'school': student.school.name,
            'month': fee.month,
            'current_paid': float(fee.paid_amount),
            'total_fee': float(fee.total_fee),
            'balance': float(fee.balance_due)
        }

    fee = fees.first()
    return fee.id, None, {
        'student_name': student.name,
        'school': student.school.name,
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

        if action_name == 'UPDATE_FEE':
            return self._resolve_update_fee(params)

        if action_name == 'GET_FEES':
            return self._resolve_get_fees(params)

        if action_name == 'GET_FEE_SUMMARY':
            return self._resolve_get_fees(params)  # Same resolution

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
        if not params.get('paid_amount'):
            return {
                "success": False,
                "clarify": "What is the payment amount?"
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
        """Resolve school for GET_FEES."""
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


def get_resolver(context: Dict[str, Any] = None) -> ParameterResolver:
    """Get parameter resolver instance."""
    return ParameterResolver(context)
