from datetime import datetime, timedelta
from decimal import Decimal
import os
from django.http import JsonResponse
from django.utils.timezone import now
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from supabase import create_client
from django.contrib.auth import get_user_model
from .models import Student, Fee, School, Attendance,  CustomUser
from .serializers import StudentSerializer, SchoolSerializer,  FeeSummarySerializer, StudentProfileSerializer, StudentProfileDetailSerializer
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
import logging

from .serializers import SchoolSerializer, SchoolStatsSerializer

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
import logging
from rest_framework import status
from django.db import transaction
from datetime import datetime
import uuid  # Add this import
from django.conf import settings
from students.models import StudentImage
from rest_framework.views import APIView
from datetime import datetime, timedelta
from .models import StudentImage


# Initialize Supabase Client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)



def home(request):
    return render(request, 'index.html', {'user': request.user})


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend]                    # ← THIS LINE IS MISSING OR WRONG
    filterset_fields = ['school', 'student_class', 'status']


# In students/views.py
# ADD these imports at the top if not already present:




# ✅ ADD THIS NEW VIEWSET:

# In students/views.py
# ADD these imports at the top:

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum
from .models import School, Student
from .serializers import SchoolSerializer, SchoolStatsSerializer


# ✅ ADD THIS NEW VIEWSET:

class SchoolViewSet(viewsets.ModelViewSet):
    """
    ViewSet for School CRUD operations
    Admin: Full access | Teacher: Read-only
    """
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated]
    
    # ✅ ADD THIS METHOD:
    def get_queryset(self):
        """
        Filter schools based on user role:
        - Admin: See all schools
        - Teacher: See only assigned schools
        """
        user = self.request.user
        
        if user.role == 'Admin':
            return School.objects.all()
        elif user.role == 'Teacher':
            return user.assigned_schools.all()
        else:
            return School.objects.none()
    """
    ViewSet for School CRUD operations
    Admin: Full access | Teacher: Read-only
    """
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Only admin can create schools"""
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can create schools'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Admin and Teacher can update schools (Teacher only their assigned schools)"""
        if request.user.role not in ['Admin', 'Teacher']:
            return Response(
                {'error': 'Only admins and teachers can update schools'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Teachers can only update their assigned schools (enforced by get_queryset)
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Admin and Teacher can partially update schools (Teacher only their assigned schools)"""
        if request.user.role not in ['Admin', 'Teacher']:
            return Response(
                {'error': 'Only admins and teachers can update schools'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Teachers can only update their assigned schools (enforced by get_queryset)
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only admin can delete schools"""
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can delete schools'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        school = self.get_object()
        
        # Check if school has students
        if school.students.exists():
            return Response(
                {'error': 'Cannot delete school with active students'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """
        Get detailed statistics for a specific school
        Endpoint: /api/schools/{id}/stats/
        """
        school = self.get_object()
        serializer = SchoolStatsSerializer(school)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Get overview statistics for all schools
        Endpoint: /api/schools/overview/
        """
        schools = School.objects.filter(is_active=True)
        
        total_students = Student.objects.filter(
            status='Active',
            school__in=schools
        ).count()
        
        total_revenue = Student.objects.filter(
            status='Active',
            school__in=schools
        ).aggregate(total=Sum('monthly_fee'))['total'] or 0
        
        data = {
            'total_schools': schools.count(),
            'total_students': total_students,
            'total_monthly_revenue': float(total_revenue),
            'schools': SchoolSerializer(schools, many=True).data
        }
        
        return Response(data)
    
    def list(self, request, *args, **kwargs):
        """List all schools with basic stats"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter by active status if requested
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ✅ UPDATE your existing get_schools_with_classes function:
# FIND the existing function and REPLACE it with this:

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_schools_with_classes(request):
    """
    Returns schools with their class breakdown and student counts
    Enhanced with new school fields
    """
    schools = School.objects.filter(is_active=True)
    
    result = []
    for school in schools:
        # Get class breakdown
        classes = school.students.filter(status='Active').values('student_class').annotate(
            strength=Count('id')
        ).order_by('student_class')
        
        result.append({
            'id': school.id,
            'name': school.name,
            'address': school.address or school.location or 'N/A',
            'logo': school.logo,
            'latitude': float(school.latitude) if school.latitude else None,
            'longitude': float(school.longitude) if school.longitude else None,
            'contact_email': school.contact_email,
            'contact_phone': school.contact_phone,
            'total_capacity': school.total_capacity,
            'is_active': school.is_active,
            'classes': [
                {
                    'className': cls['student_class'],
                    'strength': cls['strength']
                }
                for cls in classes
            ]
        })
    
    return Response(result)


# ✅ ADD these new API endpoints:

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_school(request):
    """
    Create a new school (Admin only)
    Endpoint: POST /api/schools/create/
    """
    if request.user.role != 'Admin':
        return Response(
            {'error': 'Only admins can create schools'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = SchoolSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_school(request, pk):
    """
    Update a school (Admin and Teacher)
    Endpoint: PUT/PATCH /api/schools/update/{id}/
    Teachers can only update their assigned schools.
    """
    if request.user.role not in ['Admin', 'Teacher']:
        return Response(
            {'error': 'Only admins and teachers can update schools'},
            status=status.HTTP_403_FORBIDDEN
        )

    # For teachers, verify they are assigned to this school
    if request.user.role == 'Teacher':
        if not request.user.assigned_schools.filter(pk=pk).exists():
            return Response(
                {'error': 'You can only update schools assigned to you'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    try:
        school = School.objects.get(pk=pk)
    except School.DoesNotExist:
        return Response(
            {'error': 'School not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    partial = request.method == 'PATCH'
    serializer = SchoolSerializer(school, data=request.data, partial=partial)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_school(request, pk):
    """
    Delete a school (Admin only)
    Endpoint: DELETE /api/schools/delete/{id}/
    """
    if request.user.role != 'Admin':
        return Response(
            {'error': 'Only admins can delete schools'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        school = School.objects.get(pk=pk)
    except School.DoesNotExist:
        return Response(
            {'error': 'School not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if school has students
    if school.students.exists():
        return Response(
            {'error': 'Cannot delete school with active students'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    school.delete()
    return Response(
        {'message': 'School deleted successfully'},
        status=status.HTTP_204_NO_CONTENT
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_school_stats(request, pk):
    """
    Get detailed statistics for a specific school
    Endpoint: GET /api/schools/stats/{id}/
    """
    try:
        school = School.objects.get(pk=pk)
    except School.DoesNotExist:
        return Response(
            {'error': 'School not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SchoolStatsSerializer(school)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_schools_overview(request):
    """
    Get overview statistics for all schools
    Endpoint: GET /api/schools/overview/
    """
    schools = School.objects.filter(is_active=True)
    
    total_students = Student.objects.filter(
        status='Active',
        school__in=schools
    ).count()
    
    total_revenue = Student.objects.filter(
        status='Active',
        school__in=schools
    ).aggregate(total=Sum('monthly_fee'))['total'] or 0
    
    data = {
        'total_schools': schools.count(),
        'total_students': total_students,
        'total_monthly_revenue': float(total_revenue),
        'schools': SchoolSerializer(schools, many=True).data
    }
    
    return Response(data)

# ✅ ADD THIS HELPER VIEW for getting schools with classes (like your current SchoolsPage needs):

from rest_framework.views import APIView

class SchoolsWithClassesView(APIView):
    """
    Returns schools with their class breakdown and student counts
    This is what your current SchoolsPage.js expects
    Endpoint: /api/schools/with-classes/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        schools = School.objects.filter(is_active=True)
        
        result = []
        for school in schools:
            # Get class breakdown
            classes = school.students.filter(status='Active').values('student_class').annotate(
                strength=Count('id')
            ).order_by('student_class')
            
            result.append({
                'id': school.id,
                'name': school.name,
                'address': school.address or school.location or 'N/A',
                'logo': school.logo,
                'latitude': float(school.latitude) if school.latitude else None,
                'longitude': float(school.longitude) if school.longitude else None,
                'classes': [
                    {
                        'className': cls['student_class'],
                        'strength': cls['strength']
                    }
                    for cls in classes
                ]
            })
        
        return Response(result)



@permission_classes([IsAuthenticated])
def get_class_image_count(request):
    school_id = request.GET.get("school_id")
    
    if not school_id:
        return JsonResponse({"error": "School ID required"}, status=400)

    # Get start & end of the current week (Monday to Sunday)
    start_of_week = now().date() - timedelta(days=now().weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)  # Sunday

    # Query images uploaded in this week, grouped by class
    image_counts = (
        StudentImage.objects.filter(
            student__school_id=school_id,
            uploaded_at__date__range=[start_of_week, end_of_week]
        )
        .values("student__class_id")
        .annotate(image_count=Count("id"))
    )

    # Convert QuerySet to dictionary
    response_data = {item["student__class_id"]: item["image_count"] for item in image_counts}
    
    return JsonResponse(response_data)

    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_schools(request):
    user = request.user
    print(f"🔍 Debug: User={user.username}, Role={user.role}")

    if user.role == "Admin":
        schools = School.objects.all()  # ✅ Admins see all schools
    elif user.role == "Teacher":
        schools = user.assigned_schools.all()  # ✅ Teachers see only assigned schools
    else:
        return Response({"error": "Unauthorized"}, status=403)

    # ✅ Only filter classes if the user is a teacher
    if user.role == "Teacher":
        assigned_schools = user.assigned_schools.all()
    else:
        assigned_schools = schools  # ✅ Admin should see all schools

    schools_data = []
    for school in assigned_schools:
        classes = Student.objects.filter(school=school).values_list('student_class', flat=True).distinct()
        schools_data.append({
            "id": school.id,
            "name": school.name,
            "classes": list(classes),
            "address": school.location,
        })

    print(f"✅ Schools Response: {schools_data}")  # Debugging output
    return Response(schools_data)



  
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_classes(request):
    """Return unique class names for a given school."""
    user = request.user
    school_id = request.GET.get("school", None)

    # ✅ Validate authentication
    if not user.is_authenticated:
        return Response({"error": "Authentication credentials were not provided."}, status=401)

    # ✅ Ensure school ID is provided
    if not school_id:
        return Response({"error": "School ID is required"}, status=400)

    try:
        classes = Student.objects.filter(school_id=school_id).values_list('student_class', flat=True).distinct()

        if not classes:
            return Response({"error": "No classes found for this school."}, status=404)

        return Response(list(classes))

    except Exception as e:
        return Response({"error": str(e)}, status=500)


class FeeSummaryView(APIView):
    def get(self, request):
        month = request.query_params.get('month')
        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Aggregate fee data by school for the specified month
            fee_summary = Fee.objects.filter(month=month).values('school_id').annotate(
                total_fee=Sum('total_fee'),
                paid_amount=Sum('paid_amount'),
                balance_due=Sum('balance_due')
            )

            # Fetch school names
            schools = School.objects.all()
            school_map = {school.id: school.name for school in schools}

            # Prepare response data
            result = []
            for entry in fee_summary:
                school_id = entry['school_id']
                school_name = school_map.get(school_id, f"School {school_id}")
                result.append({
                    'school_id': school_id,
                    'school_name': school_name,
                    'total_fee': float(entry['total_fee']),
                    'paid_amount': float(entry['paid_amount']),
                    'balance_due': float(entry['balance_due'])
                })

            serializer = FeeSummarySerializer(result, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_students(request):
    print(f"🔍 Backend Request: School={request.GET.get('school', '')}, Class={request.GET.get('class', '')}")
    user = request.user

    if request.method == 'POST':
            

            try:
                data = request.data
                school_id = data.get("school")
                password = data.get("password")  # From frontend

                if not school_id:
                    return Response({"error": "School ID is required"}, status=400)
                if not password:
                    return Response({"error": "Password is required"}, status=400)

                try:
                    school = School.objects.get(id=school_id)
                except School.DoesNotExist:
                    return Response({"error": "Invalid school ID"}, status=400)

                # ─────── Generate reg_num exactly as before (server-side) ───────
                school_code = ''.join(word[0].upper() for word in school.name.strip().split())
                year = datetime.now().year % 100
                existing_count = Student.objects.filter(school=school).count() + 1
                reg_num = f"{year:02d}-KK-{school_code}-{existing_count:03d}"

                while Student.objects.filter(reg_num=reg_num).exists() or CustomUser.objects.filter(username=reg_num).exists():
                    existing_count += 1
                    reg_num = f"{year:02d}-KK-{school_code}-{existing_count:03d}"

                # ─────── Atomic: Create User + Student together ───────
                with transaction.atomic():
                    # 1. Create CustomUser with username = reg_num
                    User = get_user_model()
                    user = User.objects.create_user(
                        username=reg_num,                  # ← EXACTLY the reg_num
                        first_name=data.get("name", "").split(maxsplit=1)[0] if data.get("name") else "",
                        role="Student",
                        password=password
                    )

                    # 2. Create Student and link it
                    student = Student.objects.create(
                        name=data.get("name"),
                        reg_num=reg_num,                   # same as username
                        school=school,
                        student_class=data.get("student_class"),
                        monthly_fee=data.get("monthly_fee"),
                        phone=data.get("phone"),
                        gender=data.get("gender", "Male"),
                        date_of_registration=data.get("date_of_registration") or datetime.now().date(),
                        user=user                          # OneToOne link
                    )

                return Response({
                    "message": "Student added successfully",
                    "id": student.id,
                    "reg_num": student.reg_num,
                    "username": user.username,             # same as reg_num
                    "login_info": f"Username: {reg_num} | Password: (as set)"
                }, status=201)

            except Exception as e:
                logger.error(f"❌ Error adding student: {str(e)}")
                return Response({"error": str(e)}, status=400)
    
    elif request.method == 'GET':  # ✅ Handle fetching students
        school_name = request.GET.get("school", "")
        student_class = request.GET.get("class", "")

        print(f"🔍 Backend Request: School={school_name}, Class={student_class}, User={user.username}, Role={user.role}")

        try:
            if user.role == "Admin":
                students = Student.objects.filter(status="Active").select_related("school").all()  # ✅ Fetch only Active students

            elif user.role == "Teacher":
                # Teacher can access only their assigned schools
                assigned_school_names = user.assigned_schools.values_list("name", flat=True)
                assigned_school_ids   = user.assigned_schools.values_list("id", flat=True)

                print(f"Teacher {user.username} → Assigned schools: {list(assigned_school_names)}")

                # CASE 1: Frontend sends a specific school name → validate it
                if school_name:
                    if school_name not in assigned_school_names:
                        print(f"Unauthorized attempt: {user.username} tried to access {school_name}")
                        return Response([])  # silently return empty (security)

                    # Filter by the requested school name
                    queryset = Student.objects.filter(school__name=school_name, status="Active")

                # CASE 2: No school_name sent → AUTO-FILTER to teacher's schools
                else:
                    if not assigned_school_ids:
                        print(f"Teacher {user.username} has no assigned schools")
                        return Response([])

                    print(f"Auto-filtering to teacher's assigned schools: {list(assigned_school_names)}")
                    queryset = Student.objects.filter(school_id__in=assigned_school_ids, status="Active")

                # Apply class filter if provided
                if student_class:
                    queryset = queryset.filter(student_class=student_class)

                students = queryset
            else:
                print("❌ Unauthorized access attempt by:", user.username)
                return Response({"error": "Unauthorized"}, status=403)

            print(f"✅ Found {students.count()} students for {user.username}")

            student_data = [
                {
                    "id": student.id,
                    "reg_num": student.reg_num,
                    "name": student.name,
                    "school": student.school.name if student.school else "Unknown",
                    "student_class": student.student_class,
                    "monthly_fee": student.monthly_fee,
                    "phone": student.phone
                }
                for student in students
            ]

            print(f"✅ Returning Students with School Names and Classes: {student_data}")
            return Response(student_data)

        except Exception as e:
            print(f"❌ ERROR in get_students: {str(e)}")
            return Response({"error": "Server error, check logs"}, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_school_details(request):
    """Fetch school details using either school ID or school name"""
    school_id = request.GET.get("school_id", None)
    school_name = request.GET.get("school_name", None)

    if school_id:
        try:
            school = School.objects.get(id=school_id)
            return JsonResponse({"id": school.id, "name": school.name})
        except School.DoesNotExist:
            return JsonResponse({"error": "Invalid school ID"}, status=400)

    if school_name:
        try:
            school = School.objects.get(name=school_name)
            return JsonResponse({"id": school.id, "name": school.name})
        except School.DoesNotExist:
            return JsonResponse({"error": "Invalid school name"}, status=400)

    return JsonResponse({"error": "Provide either school_id or school_name"}, status=400)


# 2️⃣ Add a new student
@api_view(['POST'])
def add_student(request):
    data = request.data

    try:
        school_id = data.get("school")  # ✅ Get school as an ID
        school = School.objects.get(id=school_id)  # ✅ Retrieve school object

        student = Student.objects.create(
            name=data.get("name"),
            reg_num=data.get("reg_num"),
            school=school,  # ✅ Assign school object
            student_class=data.get("student_class"),
            monthly_fee=data.get("monthly_fee"),
            phone=data.get("phone"),
            date_of_registration=data.get("date_of_registration"),  # ✅ Save registration date
        )

        return Response({"message": "Student added successfully", "id": student.id})

    except School.DoesNotExist:
        return Response({"error": "Invalid school ID"}, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=400)




# 3️⃣ Update a student
@api_view(['PUT'])
def update_student(request, pk):
    try:
        student = Student.objects.get(pk=pk)
        data = request.data
        student.name = data.get('name', student.name)
        student.reg_num = data.get('reg_num', student.reg_num)
        student.school = data.get('school', student.school)
        student.student_class = data.get('student_class', student.student_class)
        student.monthly_fee = data.get('monthly_fee', student.monthly_fee)
        student.phone = data.get('phone', student.phone)
        student.save()
        return Response({"message": "Student updated successfully"})
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['GET'])
def students_per_school(request):
    """Return total active students per school with school names instead of IDs."""
    data = (
        Student.objects.filter(status="Active")  # Filter for active students only
        .values('school')  # Group by school_id
        .annotate(total_students=Count('id'))  # Count active students per school
        .order_by('-total_students')  # Optional: Sort by descending count for presentation
    )

    # Convert school_id to school name
    formatted_data = []
    for entry in data:
        try:
            school = School.objects.get(id=entry['school'])  # Use .get() for efficiency with primary key
            school_name = school.name
        except School.DoesNotExist:
            school_name = "Unknown"
        
        formatted_data.append({
            'school': school_name,
            'total_students': entry['total_students']
        })

    return Response(formatted_data)


@api_view(['POST'])
def update_fees(request):
    """Updates total_fee, status, and paid_amount in the Fee table"""
    
    fees_data = request.data.get("fees", [])

    if not fees_data:
        print("❌ No fee data received in request")  # Debugging
        return Response({"error": "No fee data received"}, status=400)

    print(f"✅ Received {len(fees_data)} fee updates")  # Debugging
    updated_fees = []

    for fee_data in fees_data:
        try:
            print(f"🔄 Processing fee ID: {fee_data['id']}")  # Debugging

            # Fetch the fee record from the database
            fee = Fee.objects.get(id=fee_data["id"])

            # Update total_fee if present
            if "total_fee" in fee_data:
                fee.total_fee = Decimal(str(fee_data["total_fee"]))
                print(f"🛠️ Updated total_fee to: {fee.total_fee}")

            # Update paid_amount and recalculate balance_due
            paid_amount = Decimal(str(fee_data.get("paid_amount", 0)))
            if paid_amount > fee.total_fee:
                print(f"❌ Paid amount {paid_amount} exceeds total fee {fee.total_fee} for fee ID {fee.id}")
                return Response({"error": f"Paid amount {paid_amount} exceeds total fee {fee.total_fee} for fee ID {fee.id}"}, status=400)
            
            fee.paid_amount = paid_amount
            fee.balance_due = fee.total_fee - fee.paid_amount

            # Update status based on balance_due
            fee.status = "Paid" if fee.balance_due == 0 else "Pending"

            # Save the updated record
            fee.save()

            # Debugging logs
            print(f"✅ Updated Fee ID: {fee.id} | Total Fee: {fee.total_fee} | Paid: {fee.paid_amount} | Status: {fee.status} | Balance Due: {fee.balance_due}")

            # Collect updated fee for response
            updated_fees.append({
                "id": fee.id,
                "total_fee": str(fee.total_fee),
                "paid_amount": str(fee.paid_amount),
                "balance_due": str(fee.balance_due),
                "status": fee.status,
                "student_name": fee.student_name,
                "student_class": fee.student_class,
                "month": fee.month,
                "school": fee.school.name if fee.school else ""
            })

        except Fee.DoesNotExist:
            print(f"❌ Fee ID {fee_data['id']} not found in database")  # Debugging
            continue

        except Exception as e:
            print(f"❌ Error updating fee ID {fee_data['id']}: {e}")  # Debugging
            return Response({"error": str(e)}, status=500)

    return Response({"message": "Fee records updated successfully!", "fees": updated_fees})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schools_list(request):
    """Return all schools"""
    schools = School.objects.all()
    
    print(f"🔍 Schools Found: {schools.count()}")  # ✅ Debugging
    
    serializer = SchoolSerializer(schools, many=True)
    print(f"✅ Returning Schools: {serializer.data}")  # ✅ Log response

    return Response(serializer.data)


@api_view(['GET'])
def get_fees(request):
    fees = Fee.objects.all()

    # Use school_id, class, and month filters
    school_id = request.GET.get("school_id")
    student_class = request.GET.get("class")
    month = request.GET.get("month")

    if school_id:
        fees = fees.filter(school_id=school_id)
    if student_class:
        fees = fees.filter(student_class=student_class)
    if month:
        fees = fees.filter(month=month)

    fee_list = [{
        "id": fee.id,
        "student_name": fee.student_name,
        "school": fee.school,
        "school": fee.school.name if fee.school else "",  # ✅ FIXED HERE
        "student_class": fee.student_class,
        "monthly_fee": fee.monthly_fee,
        "month": fee.month,
        "total_fee": fee.total_fee,
        "paid_amount": fee.paid_amount,
        "balance_due": fee.balance_due,
        "payment_date": fee.payment_date,
        "status": fee.status,
        "student_id": fee.student_id
    } for fee in fees]

    return Response(fee_list)


@api_view(['GET'])
def fee_received_per_month(request):
    data = Fee.objects.values('school', 'month').annotate(total_fee=Sum('paid_amount'))
    return Response(data)

@api_view(['DELETE'])
def delete_student(request, pk):
    try:
        student = Student.objects.get(pk=pk)
        student.delete()
        return Response({"message": "Student deleted successfully"}, status=204)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)


from django.db.models import Count
from datetime import timedelta
from django.utils.timezone import now

@api_view(['GET'])
def new_registrations(request):
    thirty_days_ago = now() - timedelta(days=30)
    
    # ✅ Count students per school in DATABASE
    registrations = Student.objects.filter(
        date_of_registration__gte=thirty_days_ago,
        status='Active'
    ).values('school__name').annotate(
        count=Count('id')
    ).order_by('-count')
    
    data = [
        {
            'school': reg['school__name'] or 'Unknown',
            'count': reg['count']
        }
        for reg in registrations
    ]
    
    return Response(data)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_new_month_fees(request):
    """
    Create monthly fee records for a school.
    Supports two payment modes:
    1. Per Student: Uses individual student.monthly_fee
    2. Monthly Subscription: Divides total subscription among active students
    """
    school_id = request.data.get("school_id")
    selected_month = request.data.get("month")
    force_overwrite = request.data.get("force_overwrite", False)

    # Validation
    if not school_id:
        return Response({"error": "Missing school_id in request."}, status=400)

    try:
        school_instance = School.objects.get(id=school_id)
    except School.DoesNotExist:
        return Response({"error": "Invalid school_id provided."}, status=400)

    # Determine month
    if selected_month:
        month_str = selected_month
    else:
        latest_fee = Fee.objects.filter(school_id=school_id).order_by('-id').first()
        if latest_fee:
            prev_month_date = datetime.strptime(latest_fee.month, "%b-%Y")
            next_month = prev_month_date.month + 1
            next_year = prev_month_date.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            month_str = datetime(next_year, next_month, 1).strftime("%b-%Y")
        else:
            month_str = datetime.now().strftime("%b-%Y")

    # Check for existing records
    existing = Fee.objects.filter(school_id=school_id, month=month_str)
    if existing.exists() and not force_overwrite:
        return Response({
            "warning": f"Records for {month_str} already exist.",
            "action_required": "Set 'force_overwrite' to True to replace."
        }, status=409)

    # Get active students
    active_students = Student.objects.filter(status="Active", school_id=school_id)
    student_count = active_students.count()
    
    if student_count == 0:
        return Response({
            "warning": f"No active students found for {school_instance.name}.",
            "records_created": 0
        }, status=200)

    # 💰 PAYMENT MODE LOGIC - THIS IS THE NEW PART
    payment_mode = school_instance.payment_mode
    
    # Validate subscription mode
    if payment_mode == 'monthly_subscription':
        if not school_instance.monthly_subscription_amount or school_instance.monthly_subscription_amount <= 0:
            return Response({
                "error": "School is in Monthly Subscription mode but subscription amount is not set or invalid.",
                "action_required": "Set monthly_subscription_amount for this school."
            }, status=400)
        
        # Calculate fee per student
        subscription_amount = Decimal(str(school_instance.monthly_subscription_amount))
        fee_per_student = (subscription_amount / student_count).quantize(
            Decimal('0.01'), 
            rounding=ROUND_HALF_UP
        )
        
        # Calculate adjustment for rounding
        total_before_adjustment = fee_per_student * student_count
        adjustment = subscription_amount - total_before_adjustment
    else:
        # Per Student Mode
        fee_per_student = None
        adjustment = Decimal('0.00')

    # Delete existing if overwrite
    if force_overwrite:
        existing.delete()

    # Create fee records
    now = datetime.now()
    new_fees = []
    adjustment_applied = False
    
    with transaction.atomic():
        for student in active_students:
            # Determine fee for this student
            if payment_mode == 'monthly_subscription':
                student_fee = fee_per_student
                # Apply adjustment to first student
                if not adjustment_applied and adjustment != 0:
                    student_fee += adjustment
                    adjustment_applied = True
            else:
                # Use individual student fee
                student_fee = student.monthly_fee

            new_fees.append(Fee(
                student_id=student.id,
                student_name=student.name,
                student_class=student.student_class,
                monthly_fee=student_fee,
                month=month_str,
                total_fee=student_fee,
                paid_amount=Decimal('0.00'),
                balance_due=student_fee,
                payment_date=now.strftime("%Y-%m-15"),
                status="Pending",
                school=school_instance
            ))
        
        Fee.objects.bulk_create(new_fees)

    # Response
    return Response({
        "message": f"✅ Fee records created for {school_instance.name} - {month_str}",
        "records_created": len(new_fees),
        "payment_mode": payment_mode,
        "school_name": school_instance.name,
        "month": month_str,
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_student_image(request):
    """Uploads student images to Supabase Storage"""

    if 'image' not in request.FILES:
        return Response({"error": "No image provided"}, status=400)

    image = request.FILES['image']
    student_id = request.data.get('student_id')
    session_date = request.data.get('session_date')

    if not student_id or not session_date:
        return Response({"error": "Student ID and Date are required"}, status=400)

    # Generate a unique filename
    ext = os.path.splitext(image.name)[1]  # Get file extension (.jpg, .png, etc.)
    unique_filename = f"{student_id}/{session_date}_{uuid.uuid4().hex}{ext}"

    try:
        # Upload to Supabase Storage
        response = supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
            unique_filename, image.read()
        )

        # Check for errors in response
        if isinstance(response, dict) and "error" in response:
            return Response({"error": response["error"]["message"]}, status=500)

        # Generate a signed URL (valid for 7 days)
        signed_url_response = supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(
            unique_filename, 604800  # 7 days in seconds
        )

        if isinstance(signed_url_response, dict) and "error" in signed_url_response:
            return Response({"error": signed_url_response["error"]["message"]}, status=500)

        return Response({
            "message": "Image uploaded successfully",
            "image_url": signed_url_response['signedURL'],
            "student_id": student_id,
            "date": session_date
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    


supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_images(request):
    student_id = request.GET.get('student_id')
    session_date = request.GET.get('session_date')

    if not student_id or not session_date:
        return Response({"error": "student_id and session_date are required"}, status=400)

    try:
        # Get all images for the student from Supabase storage
        folder_path = f"{student_id}/"
        response = supabase.storage.from_("student-images").list(folder_path)

        if "error" in response:
            return Response({"error": response["error"]["message"]}, status=500)

        # Generate signed URLs for each file
        images = [
            supabase.storage.from_("student-images").create_signed_url(f"{folder_path}{file['name']}", 604800)
            for file in response if session_date in file['name']
        ]

        return Response({"images": images})

    except Exception as e:
        return Response({"error": str(e)}, status=500)



# API for reports

@permission_classes([IsAuthenticated])
def get_student_details(request):
    student_id = request.GET.get('student_id')

    if not student_id:
        return JsonResponse({"error": "student_id is required"}, status=400)

    try:
        student = Student.objects.get(id=student_id)
        data = {
            "name": student.name,
            "reg_num": student.reg_num,  # ✅ Corrected field
            "class": student.student_class,  # ✅ Direct string field
            "school": student.school.name  # ✅ Get only the school name, not the object
        }
        return JsonResponse(data, safe=False)
    except Student.DoesNotExist:
        return JsonResponse({"error": "Student not found"}, status=404)


@api_view(["GET"])
def debug_cors(request):
    referer = request.headers.get("Referer", "No Referer")
    origin = request.headers.get("Origin", "No Origin")
    return Response({"Referer": referer, "Origin": origin})


# ============================================
# ADD TO: backend/students/views.py
# Student Profile Photo Upload/Delete Views
# ============================================

# STEP 1: ADD THESE IMPORTS AT TOP (if not already present)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
import os
import uuid

# For Supabase (if not already imported)
try:
    from supabase import create_client
except ImportError:
    pass


# ============================================
# HELPER FUNCTION - Supabase Client
# ============================================

def get_supabase_client():
    """Initialize Supabase client if configured"""
    try:
        from supabase import create_client
        supabase_url = os.environ.get('REACT_APP_SUPABASE_URL', getattr(settings, 'SUPABASE_URL', ''))
        supabase_key = os.environ.get('REACT_APP_SUPABASE_SEC_KEY', getattr(settings, 'SUPABASE_KEY', ''))
        
        if not supabase_url or not supabase_key:
            return None
        
        return create_client(supabase_url, supabase_key)
    except ImportError:
        return None
    except Exception as e:
        print(f"Warning: Could not initialize Supabase: {e}")
        return None


# ============================================
# STUDENT PHOTO UPLOAD VIEW
# ============================================

class StudentProfilePhotoUploadView(APIView):
    """
    POST: Upload student profile photo to Supabase
    Organizes photos in: students/{student_id}/profile.jpg
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload student profile photo"""
        # Verify user is a student
        if request.user.role != 'Student':
            return Response(
                {'error': 'Only students can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get uploaded file
            photo = request.FILES.get('photo')
            if not photo:
                return Response(
                    {'error': 'No photo file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize Supabase client
            supabase = get_supabase_client()
            if not supabase:
                return Response(
                    {'error': 'Supabase not configured'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get student's registration number or ID for folder name
            student_identifier = f"student_{request.user.id}"
            
            # Try to get student object to use reg_num
            try:
                from .models import Student
                student = Student.objects.filter(user=request.user).first()
                if student and student.reg_num:
                    student_identifier = student.reg_num
            except Exception as e:
                print(f"Warning: Could not get student reg_num: {e}")
            
            # Use simple filename (will overwrite previous uploads for this student)
            file_extension = os.path.splitext(photo.name)[1] or '.jpg'
            filename = f"profile{file_extension}"
            
            # Organize in student-specific folder
            folder_path = f"students/{student_identifier}"
            full_path = f"{folder_path}/{filename}"
            
            bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'profile-photos')
            
            # Read file content
            file_content = photo.read()
            
            # Delete old photo if exists (same path)
            if request.user.profile_photo_url:
                try:
                    # Extract path from URL
                    old_path = request.user.profile_photo_url.split('/public/')[-1]
                    if old_path.startswith(bucket_name):
                        old_path = old_path.replace(f"{bucket_name}/", "", 1)
                    
                    supabase.storage.from_(bucket_name).remove([old_path])
                    print(f"✅ Deleted old photo: {old_path}")
                except Exception as e:
                    print(f"Warning: Could not delete old photo: {e}")
            
            # Upload file (upsert to overwrite if exists)
            response = supabase.storage.from_(bucket_name).upload(
                path=full_path,
                file=file_content,
                file_options={
                    "content-type": photo.content_type,
                    "upsert": "true"  # Overwrite if exists
                }
            )
            
            # Get public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(full_path)
            
            # Update user profile
            request.user.profile_photo_url = public_url
            request.user.save()
            
            print(f"✅ Uploaded student photo to: {full_path}")
            
            return Response({
                'profile_photo_url': public_url,
                'message': 'Profile photo uploaded successfully'
            })
            
        except Exception as e:
            print(f"❌ Upload error: {str(e)}")
            return Response(
                {'error': f'Failed to upload photo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# STUDENT PHOTO DELETE VIEW
# ============================================

class StudentProfilePhotoDeleteView(APIView):
    """
    DELETE: Delete student profile photo from Supabase
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Delete student profile photo"""
        # Verify user is a student
        if request.user.role != 'Student':
            return Response(
                {'error': 'Only students can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            if request.user.profile_photo_url:
                # Initialize Supabase client
                supabase = get_supabase_client()
                if supabase:
                    try:
                        bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'profile-photos')
                        
                        # Extract path from URL
                        file_path = request.user.profile_photo_url.split('/public/')[-1]
                        if file_path.startswith(bucket_name):
                            file_path = file_path.replace(f"{bucket_name}/", "", 1)
                        
                        # Delete from Supabase
                        supabase.storage.from_(bucket_name).remove([file_path])
                        print(f"✅ Deleted photo: {file_path}")
                    except Exception as e:
                        print(f"Warning: Could not delete photo from Supabase: {e}")
                
                # Clear URL from user
                request.user.profile_photo_url = None
                request.user.save()
            
            return Response({'message': 'Profile photo deleted successfully'})
            
        except Exception as e:
            return Response(
                {'error': f'Failed to delete photo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# STUDENT PHOTO DELETE VIEW
# ============================================

class StudentProfilePhotoDeleteView(APIView):
    """
    DELETE: Delete student profile photo from Supabase
    Only students can delete their own photo
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Delete student profile photo"""
        # Verify user is a student
        if request.user.role != 'Student':
            return Response(
                {'error': 'Only students can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            if request.user.profile_photo_url:
                # Initialize Supabase client
                supabase = get_supabase_client()
                if supabase:
                    try:
                        # Extract filename from URL
                        filename = request.user.profile_photo_url.split('/')[-1]
                        bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'student-images')
                        
                        # Delete from Supabase
                        supabase.storage.from_(bucket_name).remove([f"profile_photos/{filename}"])
                    except Exception as e:
                        print(f"Warning: Could not delete photo from Supabase: {e}")
                
                # Clear URL from user
                request.user.profile_photo_url = None
                request.user.save()
            
            return Response({'message': 'Profile photo deleted successfully'})
            
        except Exception as e:
            return Response(
                {'error': f'Failed to delete photo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StudentProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for student to manage their own profile.
    
    Endpoints:
    - GET /api/students/profile/ - Get student's profile
    - PUT /api/students/profile/ - Update entire profile
    - PATCH /api/students/profile/ - Partial update
    
    Permissions:
    - Only authenticated students can access
    - Students can only see/edit their own profile
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = StudentProfileSerializer
    http_method_names = ['get', 'put', 'patch', 'head', 'options']  # No delete
    
    def get_queryset(self):
        """
        Filter queryset to only return the current student's profile.
        """
        # Only return the student profile for the logged-in user
        return Student.objects.filter(user=self.request.user).select_related('user', 'school')
    
    def get_object(self):
        """
        Get the current student's profile.
        Ensures students can only access their own profile.
        """
        # Check if user is a student
        if self.request.user.role != 'Student':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only students can access this endpoint.")
        
        # Get the student profile for this user
        try:
            return self.request.user.student_profile
        except Student.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Student profile not found.")
    
    def get_serializer_class(self):
        """
        Use detailed serializer for GET (includes fees/attendance),
        Use basic serializer for PUT/PATCH (for updates)
        """
        if self.action == 'retrieve':
            return StudentProfileDetailSerializer
        return StudentProfileSerializer
    
    def list(self, request, *args, **kwargs):
        """
        Override list to return single profile instead of array.
        Since students only have one profile, return it as an object.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get the student's profile.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        Update the student's profile (PUT - full update).
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            self.perform_update(serializer)
            
            # Return updated data with detailed serializer (includes fees/attendance)
            response_serializer = StudentProfileDetailSerializer(instance)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Partial update of student's profile (PATCH).
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ============================================
# KEEP YOUR EXISTING FUNCTION-BASED VIEW
# (for backward compatibility or other uses)
# ============================================

from rest_framework.decorators import api_view, permission_classes
from .models import Fee, Attendance

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_student_data(request):
    """
    LEGACY ENDPOINT (Optional - keep for backward compatibility)
    Returns the logged-in student's FULL profile.
    
    NOTE: Consider using StudentProfileViewSet instead for new code.
    """
    # 1. Role Check
    if request.user.role != 'Student':
        return Response({"error": "Access denied"}, status=403)

    # 2. Get the linked Student profile
    try:
        student = request.user.student_profile 
        user = request.user 
    except AttributeError:
        return Response({"error": "Student profile not found"}, status=404)

    # 3. Construct Data
    data = {
        # --- FROM AUTH TABLE ---
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,

        # --- FROM STUDENT TABLE ---
        "id": student.id,
        "reg_num": student.reg_num,
        "school": student.school.name,
        "class": student.student_class,
        "phone": student.phone,
        "address": student.address,
        
        # Photo: User table (centralized)
        "profile_photo_url": user.profile_photo_url,

        # --- EXTRAS ---
        "fees": list(
            Fee.objects.filter(student_id=student.id)
            .values("month", "balance_due", "status")
            .order_by("-month")[:10]
        ),
        "attendance": list(
            Attendance.objects.filter(student=student)
            .values("session_date", "status")
            .order_by("-session_date")[:30]
        ),
    }

    return Response(data, status=200)



logger = logging.getLogger(__name__)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_student_data(request):
    """
    Returns the logged-in student's FULL profile.
    Merges User (Identity) and Student (Contact/Academic) tables.
    """
    # 1. Role Check
    if request.user.role != 'Student':
        return Response({"error": "Access denied"}, status=403)

    # 2. Get the linked Student profile
    try:
        # Assuming your User model has a related_name='student_profile' 
        # based on your previous code. If not, it might be request.user.students_student
        student = request.user.student_profile 
        user = request.user 
    except AttributeError:
        return Response({"error": "Student profile not found"}, status=404)

    # 3. Construct Data (Mapping fields to correct tables)
    data = {
        # --- FROM AUTH TABLE (students_customuser) ---
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        # fallback for full name
        "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,

        # --- FROM STUDENT TABLE (students_student) ---
        "id": student.id,                   # Student ID (for updates)
        "reg_num": student.reg_num,
        "school": student.school.name,      # Assuming school is a Foreign Key
        "class": student.student_class,
        "phone": student.phone,             # <--- Now fetching from STUDENT table
        "address": student.address,         # <--- Now fetching from STUDENT table
        
        # Photo: Student table has priority, fallback to User table
        "profile_photo_url": student.profile_photo_url or user.profile_photo_url,

        # --- EXTRAS (Fees/Attendance) ---
        "fees": list(
            Fee.objects.filter(student_id=student.id)
            .values("month", "balance_due", "status")
            .order_by("-month")[:10]
        ),
        "attendance": list(
            Attendance.objects.filter(student=student)
            .values("session_date", "status")
            .order_by("-session_date")[:30]
        ),
    }

    return Response(data, status=200)





@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_single_fee(request):
    """
    Create a single fee record for a specific student.
    Auto-fetches monthly_fee from the Student model.
    
    Endpoint: POST /api/fees/create-single/
    
    Payload:
    {
        "student_id": 123,
        "month": "Dec-2024",
        "paid_amount": 0,  # optional, defaults to 0
    }
    """
    try:
        student_id = request.data.get('student_id')
        month = request.data.get('month')
        paid_amount = request.data.get('paid_amount', 0)

        # Validation
        if not student_id or not month:
            return Response({
                'error': 'student_id and month are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate student exists
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({
                'error': 'Student not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check for existing fee record for this student/month
        existing_fee = Fee.objects.filter(
            student_id=student_id,
            month=month
        ).first()

        if existing_fee:
            return Response({
                'error': f'Fee record already exists for {student.name} in {month}',
                'existing_fee_id': existing_fee.id
            }, status=status.HTTP_409_CONFLICT)

        # Get monthly_fee from student record (auto-fetch)
        total_fee = float(student.monthly_fee or 0)
        paid_amount = float(paid_amount or 0)
        balance_due = total_fee - paid_amount
        
        # Determine status
        if balance_due <= 0:
            fee_status = 'Paid'
        elif paid_amount > 0:
            fee_status = 'Pending'
        else:
            fee_status = 'Pending'

        # Create fee record (matching existing create_new_month_fees structure)
        fee = Fee.objects.create(
            student_id=student.id,
            student_name=student.name,
            student_class=student.student_class,
            monthly_fee=student.monthly_fee,
            month=month,
            total_fee=total_fee,
            paid_amount=paid_amount,
            balance_due=balance_due,
            payment_date=datetime.now().strftime("%Y-%m-15"),
            status=fee_status,
            school=student.school,
        )

        return Response({
            'message': f'Fee record created for {student.name}',
            'fee': {
                'id': fee.id,
                'student_id': fee.student_id,
                'student_name': fee.student_name,
                'student_class': fee.student_class,
                'monthly_fee': str(fee.monthly_fee),
                'month': fee.month,
                'total_fee': str(fee.total_fee),
                'paid_amount': str(fee.paid_amount),
                'balance_due': str(fee.balance_due),
                'status': fee.status,
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        import traceback
        print(f"❌ Error in create_single_fee: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'error': f'Failed to create fee record: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_fees(request):
    """
    Delete one or more fee records.
    
    Endpoint: POST /api/fees/delete/
    
    Payload:
    {
        "fee_ids": [1, 2, 3]
    }
    """
    try:
        fee_ids = request.data.get('fee_ids', [])

        print(f"🗑️ Delete request received for fee_ids: {fee_ids}")  # Debug log

        if not fee_ids:
            return Response({
                'error': 'No fee IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate all fees exist
        fees = Fee.objects.filter(id__in=fee_ids)
        found_ids = list(fees.values_list('id', flat=True))
        missing_ids = set(fee_ids) - set(found_ids)

        print(f"🔍 Found fees: {found_ids}, Missing: {missing_ids}")  # Debug log

        if missing_ids:
            return Response({
                'error': f'Some fee records not found: {list(missing_ids)}'
            }, status=status.HTTP_404_NOT_FOUND)

        # Permission check for teachers
        user = request.user
        if user.role == 'Teacher':
            allowed_school_ids = list(user.assigned_schools.values_list('id', flat=True))
            unauthorized = fees.exclude(school_id__in=allowed_school_ids)
            if unauthorized.exists():
                return Response({
                    'error': 'You do not have permission to delete some of these records'
                }, status=status.HTTP_403_FORBIDDEN)

        # Delete fees
        with transaction.atomic():
            deleted_count, _ = fees.delete()

        print(f"✅ Successfully deleted {deleted_count} fee records")  # Debug log

        return Response({
            'message': f'Successfully deleted {deleted_count} fee record(s)',
            'deleted_count': deleted_count,
            'deleted_ids': fee_ids
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"❌ Error in delete_fees: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'error': f'Failed to delete fee records: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)