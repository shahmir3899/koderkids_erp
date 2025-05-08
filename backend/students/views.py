from datetime import datetime, timedelta
from decimal import Decimal
import os
import random
from django.http import JsonResponse
from django.utils.timezone import now
from django.db.models import Sum, Count
from django.db import IntegrityError
from rest_framework import viewsets, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from supabase import create_client
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password
from .models import Student, Fee, School, Attendance, LessonPlan, CustomUser
from .serializers import StudentSerializer, SchoolSerializer, AttendanceSerializer, LessonPlanSerializer
from django.shortcuts import render
from django.db.models.functions import Round, Cast
from django.db.models import Q, Count, Case, When, IntegerField, FloatField
from django.db.models.functions import Round
import logging
import uuid  # Add this import
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from students.models import StudentImage
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Fee, School
from .serializers import FeeSummarySerializer


from django.db.models import Count, Case, When, IntegerField, FloatField
from django.db.models.functions import Round
from django.contrib.postgres.aggregates import ArrayAgg
from datetime import datetime, timedelta
from .models import LessonPlan, StudentImage
from .serializers import (
    MonthlyLessonsSerializer, UpcomingLessonsSerializer,
    LessonStatusSerializer, SchoolLessonsSerializer, StudentEngagementSerializer
)





def home(request):
    return render(request, 'index.html', {'user': request.user})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_logged_in_user(request):
    user = request.user
    return Response({"id": user.id, 'username': user.username, 'email': user.role})

class StudentViewSet(viewsets.ModelViewSet):
    
    queryset = Student.objects.all().select_related("school_id")  # ✅ Fix ForeignKey reference
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]  # ✅ Require authentication

    def get_queryset(self):
        user = self.request.user

        if user.role == "Admin":
            return Student.objects.all()  # ✅ Admins can access all students
        
        elif user.role == "Teacher":
            return Student.objects.filter(school__in=user.assigned_schools.all())  # ✅ Teachers can only access their assigned schools

        return Student.objects.none()  # ❌ Other users get no data



class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Debugging: Print user login details
        print(f"🔍 Logging In - Username: {attrs['username']}, Password: {attrs['password']}")

        # Check if user exists
        user = CustomUser.objects.filter(username=attrs['username']).first()
        if not user:
            raise serializers.ValidationError("⚠️ User not found!")

        print(f"✅ Found User: {user.username} | Active: {user.is_active}")

        # Ensure user is active
        if not user.is_active:
            raise serializers.ValidationError("User account is inactive.")

        # Include additional data
        data['role'] = user.role
        data['username'] = user.username

        return data



class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class TeacherLessonStatus(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        month = request.query_params.get('month', datetime.today().strftime('%Y-%m'))
        try:
            year, month_num = map(int, month.split('-'))
            lessons = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month_num
            ).values('student_class', 'school__name').annotate(
                planned_lessons=Count('id', distinct=True),
                completed_lessons=Count(
                    Case(
                        When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                        output_field=IntegerField()
                    ),
                    distinct=True
                ),
                completion_rate=Round(
                    Case(
                        When(planned_lessons__gt=0, then=(
                            1.0 * Count(
                                Case(
                                    When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                                    output_field=IntegerField()
                                )
                            ) / Count('id') * 100.0
                        )),
                        default=0.0,
                        output_field=FloatField()
                    ), 2
                )
            ).order_by('student_class')

            if not lessons.exists():
                return Response([], status=status.HTTP_200_OK)

            serializer = LessonStatusSerializer(lessons, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lesson_plan_range(request):
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    school_id = request.GET.get("school_id")
    student_class = request.GET.get("student_class")

    if not (start_date and end_date and school_id and student_class):
        return Response({"error": "Missing required parameters"}, status=400)

    # Fetch lessons for the given date range
    lessons = LessonPlan.objects.filter(
        session_date__range=[start_date, end_date],
        school_id=school_id,
        student_class=student_class
    ).order_by("session_date")

    serialized_data = LessonPlanSerializer(lessons, many=True)
    
    return Response(serialized_data.data)

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

    
@api_view(['POST'])
def register_user(request):
    data = request.data
    
    # Check if username already exists
    if CustomUser.objects.filter(username=data.get('username')).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create user
    user = CustomUser.objects.create(
        username=data['username'],
        email=data['email'],
        password=make_password(data['password'])  # Hash password
    )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': 'User registered successfully',
        'refresh': str(refresh),
        'access': str(refresh.access_token)
    }, status=status.HTTP_201_CREATED)


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



  
@api_view(['POST'])  # ✅ Only allow attendance submission
@permission_classes([IsAuthenticated])
def submit_attendance(request):
    user = request.user
    if user.role != "Teacher":
        return Response({"error": "Unauthorized"}, status=403)

    attendance_data = request.data.get("attendance", [])
    
    for entry in attendance_data:
        student_id = entry.get("student_id")
        status = entry.get("status")  # "Present" or "Absent"
        date = entry.get("date")

        student = Student.objects.filter(id=student_id, school__in=user.assigned_schools.all()).first()
        if not student:
            return Response({"error": f"Unauthorized for student ID {student_id}"}, status=403)

        Attendance.objects.update_or_create(
            student=student, date=date,
            defaults={"status": status}
        )

    return Response({"message": "Attendance recorded successfully!"})

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

            if not school_id:
                return Response({"error": "School ID is required"}, status=400)

            try:
                school = School.objects.get(id=school_id)
            except School.DoesNotExist:
                return Response({"error": "Invalid school ID"}, status=400)

            # ✅ Auto-generate unique reg_num
            school_code = ''.join(word[0].upper() for word in school.name.strip().split())
            year = datetime.now().year % 100
            existing_count = Student.objects.filter(school=school).count() + 1
            reg_num = f"{year:02d}-KK-{school_code}-{existing_count:03d}"

            while Student.objects.filter(reg_num=reg_num).exists():
                existing_count += 1
                reg_num = f"{year:02d}-KK-{school_code}-{existing_count:03d}"

            student = Student.objects.create(
                name=data.get("name"),
                reg_num=reg_num,
                school=school,
                student_class=data.get("student_class"),
                monthly_fee=data.get("monthly_fee"),
                phone=data.get("phone"),
                date_of_registration=data.get("date_of_registration")
            )

            return Response({
                "message": "Student added successfully",
                "id": student.id,
                "reg_num": student.reg_num
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
                assigned_schools = user.assigned_schools.values_list("name", flat=True)
                print(f"✅ Assigned Schools for {user.username}: {list(assigned_schools)}")

                if school_name and school_name not in assigned_schools:
                    print(f"❌ Unauthorized: {user.username} cannot access {school_name}")
                    return Response([])
                
                print("✅ Fetching students for:", school_name)
                students = Student.objects.filter(school__name=school_name, status="Active")  # ✅ Filter by Active status
                print(f"✅ Students before filtering class: {students.count()}")

                if student_class:
                    students = students.filter(student_class=student_class)

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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_teacher_dashboard_lessons(request):
    """
    Fetch lessons for the next 4 days (Yesterday, Today, Tomorrow, Day After Tomorrow)
    for all assigned schools and classes of the logged-in teacher.
    """
    user = request.user
    
    if user.role != "Teacher":
        return Response({"error": "Unauthorized access."}, status=403)
    
    # Get all assigned schools
    assigned_schools = user.assigned_schools.all()
    
    if not assigned_schools.exists():
        return Response({"lessons": []})
    
    # Generate the required 4 dates
    today = now().date()
    date_range = [today - timedelta(days=1), today, today + timedelta(days=1), today + timedelta(days=2)]
    
    # Fetch all classes in assigned schools
    classes_per_school = {}
    for school in assigned_schools:
        classes = Student.objects.filter(school=school).values_list("student_class", flat=True).distinct()
        classes_per_school[school.id] = list(classes)
    
    # Fetch lessons for these schools, classes, and dates
    lessons = LessonPlan.objects.filter(
        session_date__in=date_range,
        school__in=assigned_schools,
        student_class__in=[cls for classes in classes_per_school.values() for cls in classes]  # Flatten classes list
    ).select_related("school")
    
    # Format response
    lessons_data = []
    for lesson in lessons:
        lessons_data.append({
            "date": lesson.session_date,
            "school_name": lesson.school.name,
            "class_name": lesson.student_class,
            "topic": lesson.planned_topic
        })
    
    return Response({"lessons": lessons_data})









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
    """Return total students per school with school names instead of IDs."""
    data = (
        Student.objects.values('school')  # Get school_id
        .annotate(total_students=Count('id'))  # Count students per school
    )

    # Convert school_id to school name
    formatted_data = []
    for entry in data:
        school = School.objects.filter(id=entry['school']).first()
        formatted_data.append({
            'school': school.name if school else "Unknown",
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



@api_view(['GET'])
def new_registrations(request):
    """Fetch newly registered students from the last month"""
    
    last_month = now().month
    current_year = now().year

    students = Student.objects.filter(
        date_of_registration__month=last_month,
        date_of_registration__year=current_year
    )

    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_new_month_fees(request):
    school_id = request.data.get("school_id")
    selected_month = request.data.get("month")  # e.g., "Apr-2025"
    force_overwrite = request.data.get("force_overwrite", False)

    if not school_id:
        return Response({"error": "Missing school_id in request."}, status=400)

    try:
        school_instance = School.objects.get(id=school_id)
    except School.DoesNotExist:
        return Response({"error": "Invalid school_id provided."}, status=400)

    if selected_month:
        month_str = selected_month
    else:
        # Default to next month logic (if not supplied)
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

    # ❗ Check for existing records
    existing = Fee.objects.filter(school_id=school_id, month=month_str)
    if existing.exists() and not force_overwrite:
        return Response({
            "warning": f"Records for {month_str} already exist.",
            "action_required": "Set 'force_overwrite' to True to replace."
        }, status=409)

    if force_overwrite:
        existing.delete()

    active_students = Student.objects.filter(status="Active", school_id=school_id)
    now = datetime.now()
    new_fees = []

    for student in active_students:
        new_fees.append(Fee(
            student_id=student.id,
            student_name=student.name,
            student_class=student.student_class,
            monthly_fee=student.monthly_fee,
            month=month_str,
            total_fee=student.monthly_fee,
            paid_amount=0.00,
            balance_due=student.monthly_fee,
            payment_date=now.strftime("%Y-%m-15"),
            status="Pending",
            school=school_instance
        ))

    Fee.objects.bulk_create(new_fees)
    return Response({
        "message": f"✅ Fee records created for {school_instance.name} - {month_str}",
        "records_created": len(new_fees)
    }, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    """Allows teachers to mark attendance for active students and update achieved topics"""
    teacher = request.user

    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can mark attendance."}, status=403)

    session_date = request.data.get('session_date')
    attendance_records = request.data.get('attendance', [])

    if not session_date or not attendance_records:
        return Response({"error": "Invalid data provided."}, status=400)

    created_entries = []
    for record in attendance_records:
        student_id = record.get('student_id')
        status = record.get('status', "N/A")
        achieved_topic = record.get('achieved_topic', "")

        try:
            student = Student.objects.get(id=student_id, status="Active")  # Only active students

            # Fetch the correct lesson plan for this student
            lesson_plan = LessonPlan.objects.filter(
                session_date=session_date,
                student_class=student.student_class,
                school_id=student.school_id
            ).first()

            # Update the lesson plan's achieved_topic if it exists
            if lesson_plan and achieved_topic:
                lesson_plan.achieved_topic = achieved_topic
                lesson_plan.save()

            attendance, created = Attendance.objects.update_or_create(
                student=student, session_date=session_date,
                defaults={
                    "status": status,
                    "teacher": teacher,
                    "achieved_topic": achieved_topic,
                    "lesson_plan": lesson_plan if lesson_plan else None
                }
            )
            created_entries.append(attendance)

        except Student.DoesNotExist:
            return Response({"error": f"Student ID {student_id} not found or not active."}, status=400)
        except IntegrityError:
            return Response({"error": "Duplicate attendance record detected."}, status=400)

    return Response({"message": "Attendance recorded successfully!", "data": AttendanceSerializer(created_entries, many=True).data})



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_attendance(request, session_date):
    """Retrieve attendance records for a given session date"""
    attendance_records = Attendance.objects.filter(session_date=session_date)
    
    if not attendance_records.exists():
        return Response({"message": "No attendance records found for this date."}, status=200)

    serializer = AttendanceSerializer(attendance_records, many=True)
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_attendance(request, attendance_id):
    """Allows admins and teachers to edit attendance records"""
    user = request.user

    if user.role not in ['Admin', 'Teacher']:
        return Response({"error": "Only admins and teachers can edit attendance."}, status=403)

    try:
        attendance = Attendance.objects.get(id=attendance_id)

        # ✅ Teachers can only update their own records
        if user.role == 'Teacher' and attendance.teacher != user:
            return Response({"error": "You can only update attendance records you created."}, status=403)

        new_status = request.data.get('status')
        achieved_topic = request.data.get('achieved_topic')
        lesson_plan_id = request.data.get('lesson_plan_id')  # ✅ Get lesson plan from request

        if new_status not in ['Present', 'Absent', 'N/A']:
            return Response({"error": "Invalid status."}, status=400)

        # ✅ If lesson_plan_id is missing, fetch it from the database
        if not lesson_plan_id:
            lesson_plan = LessonPlan.objects.filter(
                session_date=attendance.session_date,
                student_class=attendance.student.student_class,
                school_id=attendance.student.school_id
            ).first()
            lesson_plan_id = lesson_plan.id if lesson_plan else None

        attendance.status = new_status
        attendance.achieved_topic = achieved_topic
        attendance.lesson_plan_id = lesson_plan_id  # ✅ Ensure lesson_plan_id is stored
        attendance.save()

        return Response({"message": "Attendance updated successfully!", "data": AttendanceSerializer(attendance).data})

    except Attendance.DoesNotExist:
        return Response({"error": "Attendance record not found."}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lesson_plan(request):
    """Allows teachers to create or update lesson plans for a session"""
    teacher = request.user

    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can create lesson plans."}, status=403)

    session_date = request.data.get('session_date')
    student_class = request.data.get('student_class')
    planned_topic = request.data.get('planned_topic')
    school_id = request.data.get('school_id')

    if not all([session_date, student_class, planned_topic, school_id]):
        return Response({"error": "Invalid data provided. All fields are required."}, status=400)

    try:
        school = School.objects.get(id=school_id)
        if not teacher.assigned_schools.filter(id=school.id).exists():
            return Response({"error": "You are not assigned to this school."}, status=403)

        lesson_plan, created = LessonPlan.objects.update_or_create(
            session_date=session_date,
            teacher=teacher,
            student_class=student_class,
            school=school,
            defaults={"planned_topic": planned_topic}
        )

        action = "created" if created else "updated"
        return Response({
            "message": f"Lesson plan {action} successfully!",
            "action": action,
            "data": LessonPlanSerializer(lesson_plan).data
        }, status=200)

    except School.DoesNotExist:
        return Response({"error": "Invalid school ID."}, status=400)
    except IntegrityError:
        return Response({"error": "Duplicate lesson plan detected."}, status=400)


from django.db.models import Q

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lesson_plan(request, session_date, school_id, student_class):
    """
    Fetch lesson plans for a specific date.
    If no lessons exist, return an empty list instead of 404.
    """
    try:
        logger.info(f"🔍 Fetching lessons for date: {session_date}, school: {school_id}, class: {student_class}")

        # Query for lessons on the given date
        lessons = LessonPlan.objects.filter(
            session_date=session_date,
            school_id=school_id,
            student_class=student_class
        )

        # ✅ If no lessons exist, return an empty list with 200 OK
        if not lessons.exists():
            logger.warning(f"⚠️ No lessons found for {session_date}, school {school_id}, class {student_class}. Returning empty list.")
            return JsonResponse({"lessons": []}, safe=False, status=200)

        # Serialize and return lesson data
        lesson_data = [
            {
                "id": lesson.id,
                "session_date": lesson.session_date,
                "planned_topic": lesson.planned_topic,
                "achieved_topic": lesson.achieved_topic,
            }
            for lesson in lessons
        ]

        return JsonResponse({"lessons": lesson_data}, safe=False, status=200)

    except Exception as e:
        logger.error(f"❌ Error fetching lessons: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_achieved_topic(request, lesson_plan_id):
    """Allows teachers to update the achieved lesson topic"""
    teacher = request.user

    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can update achieved topics."}, status=403)

    try:
        lesson_plan = LessonPlan.objects.get(id=lesson_plan_id)

        if lesson_plan.teacher != teacher:
            return Response({"error": "You can only update your own lesson plans."}, status=403)

        achieved_topic = request.data.get('achieved_topic')
        if not achieved_topic:
            return Response({"error": "Achieved topic cannot be empty."}, status=400)

        lesson_plan.achieved_topic = achieved_topic
        lesson_plan.save()

        return Response({"message": "Achieved topic updated successfully!", "data": LessonPlanSerializer(lesson_plan).data})
    except LessonPlan.DoesNotExist:
        return Response({"error": "Lesson plan not found."}, status=404)
    

# Initialize Supabase Client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

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



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def students_progress(request):
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('class_id')
    session_date_str = request.GET.get('session_date')

    # Validate required parameters
    if not all([school_id, student_class, session_date_str]):
        return Response({"error": "Missing required parameters: school_id, class_id, session_date"}, status=400)

    # Parse session_date from MM/DD/YYYY to YYYY-MM-DD
    try:
        session_date = datetime.strptime(session_date_str, '%m/%d/%Y').date()
        logger.info(f"Parsed session_date: {session_date}")
    except ValueError:
        logger.error(f"Invalid date format for session_date: {session_date_str}. Expected MM/DD/YYYY.")
        return Response({"error": "Invalid date format. Use MM/DD/YYYY (e.g., 03/12/2025)."}, status=400)

    # Fetch Lesson Plan
    lesson_plan = LessonPlan.objects.filter(
        session_date=session_date,
        school_id=school_id,
        student_class=student_class
    ).first()
    logger.info(f"Lesson plan found: {lesson_plan.id if lesson_plan else 'None'}")

    # Fetch Students
    students = Student.objects.filter(status="Active", school_id=school_id, student_class=student_class)
    logger.info(f"Found {students.count()} active students")

    student_data = []
    for student in students:
        attendance = Attendance.objects.filter(student=student, session_date=session_date).first()
        logger.info(f"Student {student.id} ({student.name}) - Attendance: {attendance.status if attendance else 'None'}")

        student_data.append({
            "id": student.id,
            "name": student.name,
            "class_id": student.student_class,
            "school_id": student.school_id,
            "attendance_id": attendance.id if attendance else None,
            "status": attendance.status if attendance else "N/A",
            "achieved_topic": attendance.achieved_topic if attendance else "",
            "lesson_plan_id": lesson_plan.id if lesson_plan else None
        })

    return Response({
        "students": student_data,
        "lesson_plan": LessonPlanSerializer(lesson_plan).data if lesson_plan else None
    })

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

@permission_classes([IsAuthenticated])
def get_attendance_count(request):
    student_id = request.GET.get('student_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if not student_id or not start_date or not end_date:
        return JsonResponse({"error": "student_id, start_date, and end_date are required"}, status=400)

    try:
        # Fetch the student's school
        student = Student.objects.get(id=student_id)
        school = student.school

        # Total days in the range for the student's school
        total_days = Attendance.objects.filter(
            session_date__range=[start_date, end_date],
            student__school=school  # Filter by the student's school
        ).values('session_date').distinct().count()

        # Days student was marked as "Present"
        present_days = Attendance.objects.filter(
            student_id=student_id,
            status="Present",
            session_date__range=[start_date, end_date]
        ).count()

        return JsonResponse({"present_days": present_days, "total_days": total_days})

    except Student.DoesNotExist:
        return JsonResponse({"error": "Student not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

        
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lessons_achieved(request):
    student_id = request.GET.get("student_id")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not student_id or not start_date or not end_date:
        return Response({"error": "student_id, start_date, and end_date are required"}, status=400)

    try:
        # 1️⃣ Fetch the student's class and school
        student = Student.objects.get(id=student_id)
        student_class = student.student_class
        student_school = student.school

        # 2️⃣ Fetch Planned Lessons from LessonPlan
        planned_lessons = LessonPlan.objects.filter(
            session_date__range=[start_date, end_date],
            school=student_school,
            student_class=student_class
        ).values("session_date", "planned_topic")

        # Convert planned lessons to dictionary {date: topic}
        planned_dict = {lesson["session_date"]: lesson["planned_topic"] for lesson in planned_lessons}

        # 3️⃣ Fetch Achieved Topics from Attendance (for this student)
        achieved_lessons = Attendance.objects.filter(
            session_date__range=[start_date, end_date],
            student=student
        ).values("session_date", "achieved_topic")

        # Convert achieved lessons to dictionary {date: topic}
        achieved_dict = {lesson["session_date"]: lesson["achieved_topic"] for lesson in achieved_lessons}

        # 4️⃣ Combine Planned & Achieved Topics by Date
        lessons = []
        for session_date in sorted(planned_dict.keys()):  # Ensure chronological order
            lessons.append({
                "date": session_date,
                "planned_topic": planned_dict[session_date],
                "achieved_topic": achieved_dict.get(session_date, "N/A")  # Default to "N/A" if missing
            })

        return Response({"lessons": lessons}, status=200)

    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

class TeacherLessonsSummary(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        month = request.query_params.get('month')  # e.g., "2025-04"
        school_id = request.query_params.get('school_id')  # Optional filter
        student_class = request.query_params.get('student_class')  # Optional filter

        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            year, month_num = map(int, month.split('-'))
            # Base query
            lessons_query = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month_num
            )

            # Apply filters if provided
            if school_id:
                lessons_query = lessons_query.filter(school_id=school_id)
            if student_class:
                lessons_query = lessons_query.filter(student_class=student_class)

            # Aggregate data
            lessons = lessons_query.values('school__name', 'student_class').annotate(
                planned_lessons=Count('id'),
                completed_lessons=Count(Case(
                    When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                    output_field=IntegerField()
                )),
                completion_rate=Round(
                    Case(
                        When(planned_lessons__gt=0, then=(
                            Count(Case(
                                When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                                output_field=IntegerField()
                            )) * 100.0) / Count('id')
                        ),
                        default=0.0,
                        output_field=FloatField()
                    )
                )
            ).order_by('school__name', 'student_class')

            # Serialize data (reusing MonthlyLessonsSerializer and adding fields)
            data = [
                {
                    "school_name": entry['school__name'],
                    "student_class": entry['student_class'],
                    "lesson_count": entry['planned_lessons'],  # Match existing naming
                    "planned_lessons": entry['planned_lessons'],
                    "completed_lessons": entry['completed_lessons'],
                    "completion_rate": entry['completion_rate']
                }
                for entry in lessons
            ]

            return Response(data, status=status.HTTP_200_OK)

        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in TeacherLessonsSummary: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_planned_topic(request, lesson_plan_id):
    """Allows teachers to update the planned lesson topic"""
    teacher = request.user

    if teacher.role != 'Teacher':
        logger.warning(f"Unauthorized attempt to update lesson plan by {teacher.username} (role: {teacher.role})")
        return Response({"error": "Only teachers can update planned topics."}, status=status.HTTP_403_FORBIDDEN)

    try:
        lesson_plan = LessonPlan.objects.get(id=lesson_plan_id)

        if lesson_plan.teacher != teacher:
            logger.warning(f"Teacher {teacher.username} attempted to update lesson plan {lesson_plan_id} not assigned to them")
            return Response({"error": "You can only update your own lesson plans."}, status=status.HTTP_403_FORBIDDEN)

        planned_topic = request.data.get('planned_topic')
        if not planned_topic:
            logger.error(f"Empty planned_topic received for lesson plan {lesson_plan_id}")
            return Response({"error": "Planned topic cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        lesson_plan.planned_topic = planned_topic
        lesson_plan.save()
        logger.info(f"Lesson plan {lesson_plan_id} updated by {teacher.username}: planned_topic={planned_topic}")

        return Response({
            "message": "Planned topic updated successfully!",
            "data": LessonPlanSerializer(lesson_plan).data
        }, status=status.HTTP_200_OK)

    except LessonPlan.DoesNotExist:
        logger.error(f"Lesson plan {lesson_plan_id} not found")
        return Response({"error": "Lesson plan not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Unexpected error updating lesson plan {lesson_plan_id}: {str(e)}")
        return Response({"error": f"Failed to update lesson plan: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_lesson_plan(request, lesson_plan_id):
    """Allows teachers to delete their own lesson plans"""
    teacher = request.user

    if teacher.role != 'Teacher':
        logger.warning(f"Unauthorized attempt to delete lesson plan by {teacher.username} (role: {teacher.role})")
        return Response({"error": "Only teachers can delete lesson plans."}, status=status.HTTP_403_FORBIDDEN)

    try:
        lesson_plan = LessonPlan.objects.get(id=lesson_plan_id)

        if lesson_plan.teacher != teacher:
            logger.warning(f"Teacher {teacher.username} attempted to delete lesson plan {lesson_plan_id} not assigned to them")
            return Response({"error": "You can only delete your own lesson plans."}, status=status.HTTP_403_FORBIDDEN)

        lesson_plan.delete()
        logger.info(f"Lesson plan {lesson_plan_id} deleted by {teacher.username}")

        return Response({"message": "Lesson plan deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

    except LessonPlan.DoesNotExist:
        logger.error(f"Lesson plan {lesson_plan_id} not found")
        return Response({"error": "Lesson plan not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Unexpected error deleting lesson plan {lesson_plan_id}: {str(e)}")
        return Response({"error": f"Failed to delete lesson plan: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_progress_images(request):
    """
    Fetch all stored images for a student within a given month from Supabase Storage.
    Used in Report Generation.
    """
    student_id = request.GET.get('student_id')
    month = request.GET.get('month')  # Format: YYYY-MM

    if not student_id or not month:
        return JsonResponse({"error": "student_id and month are required"}, status=400)

    try:
        # Define the folder path inside the Supabase bucket
        folder_path = f"{student_id}/"

        # Fetch all files from the student's folder in Supabase
        response = supabase.storage.from_("student-images").list(folder_path)

        if not response or "error" in response:
            return JsonResponse({"error": "Failed to fetch files from Supabase"}, status=500)

        # Filter files that start with the requested month (YYYY-MM)
        matching_images = [
            supabase.storage.from_("student-images").create_signed_url(f"{folder_path}{file['name']}", 604800)
            for file in response if file["name"].startswith(month)
        ]

        if not matching_images:
            return JsonResponse({"progress_images": [], "message": "No images found"}, status=200)

        return JsonResponse({"progress_images": matching_images})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)




@api_view(["GET"])
def debug_cors(request):
    referer = request.headers.get("Referer", "No Referer")
    origin = request.headers.get("Origin", "No Origin")
    return Response({"Referer": referer, "Origin": origin})





from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_schools_with_classes(request):
    try:
        user = request.user
        logger.info(f"🔍 Fetching schools for user: {user.username}, role: {user.role}")

        # Determine which schools to fetch based on role
        if user.role == "Admin":
            schools = School.objects.all()  # Admins see all schools
        elif user.role == "Teacher":
            # Teachers only see their assigned schools
            assigned_schools = user.assigned_schools.all()
            if not assigned_schools.exists():
                logger.warning(f"⚠️ No schools assigned to teacher: {user.username}")
                return Response([])  # Return empty list if no schools assigned
            schools = assigned_schools  # Filter to only assigned schools
        else:
            logger.error(f"❌ Unauthorized role for user: {user.username}, role: {user.role}")
            return Response({"error": "Unauthorized role"}, status=403)

        # Aggregate data for each school
        school_data = []
        for school in schools:
            # Get active students for this school and count per class
            class_counts = (
                Student.objects
                .filter(school=school, status="Active")
                .values("student_class")
                .annotate(count=Count("id"))
                .order_by("student_class")
            )

            # Convert class_counts to a list of {className, strength} objects
            classes = [
                {
                    "className": entry["student_class"],
                    "strength": entry["count"]
                }
                for entry in class_counts
            ]

            # Calculate total students
            total_students = sum(entry["count"] for entry in class_counts)

            school_data.append({
                "id": school.id,  # Include school ID
                "name": school.name,
                "address": school.location or "No location available",
                "total_students": total_students,
                "classes": classes
            })

        logger.info(f"✅ Fetched schools with classes: {school_data}")
        return Response(school_data)

    except Exception as e:
        logger.error(f"❌ Error fetching schools with classes: {str(e)}")
        return Response({"error": "Server error, check logs"}, status=500)



class TeacherLessonsByMonth(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        try:
            month = request.query_params.get('month')  # e.g., "2025-04"
            if not month:
                return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            year, month = map(int, month.split('-'))
            lessons = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month
            ).values('student_class', 'school__name').annotate(
                lesson_count=Count('id')
            ).order_by('student_class')
            serializer = MonthlyLessonsSerializer(lessons, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)

class TeacherUpcomingLessons(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        today = datetime.today()
        next_week = today + timedelta(days=7)
        lessons = LessonPlan.objects.filter(
            teacher=request.user,
            session_date__range=[today, next_week]
        ).select_related('school').order_by('session_date', 'student_class')
        serializer = UpcomingLessonsSerializer(lessons, many=True)
        return Response({"lessons": serializer.data})  # Wrap in "lessons" to match existing API


class TeacherLessonsBySchool(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        month = request.query_params.get('month')
        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            year, month = map(int, month.split('-'))
            lessons = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month
            ).values('school__name').annotate(
                total_lessons=Count('id'),
                classes_covered=ArrayAgg('student_class', distinct=True)
            ).order_by('school__name')
            serializer = SchoolLessonsSerializer(lessons, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)

class TeacherStudentEngagement(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):


        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        month = request.query_params.get('month')
        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            year, month = map(int, month.split('-'))
            engagement = StudentImage.objects.filter(
                session_date__year=year,
                session_date__month=month,
                student__school__in=request.user.assigned_schools.all()
            ).values('student__student_class').annotate(
                image_count=Count('id'),
                student_count=Count('student_id', distinct=True)
            ).order_by('student__student_class')
            serializer = StudentEngagementSerializer(engagement, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)
        

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance_counts(request):
    """
    Fetch attendance counts (Present, Absent, Not Marked) for students in a given month, school, and class.
    Parameters: month (YYYY-MM), school_id, student_class
    """
    user = request.user
    month = request.GET.get('month')  # Format: YYYY-MM
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')

    # Validate parameters
    if not all([month, school_id, student_class]):
        return Response({"error": "month, school_id, and student_class are required"}, status=400)

    try:
        # Parse month to get date range
        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1).date()
        end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()

        # Filter students by school and class
        students = Student.objects.filter(
            school_id=school_id,
            student_class=student_class,
            status="Active"
        )

        # Restrict to teacher's assigned schools if role is Teacher
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Fetch attendance records for the month
        attendance_records = Attendance.objects.filter(
            student__in=students,
            session_date__range=[start_date, end_date]
        ).values('student_id', 'status').annotate(count=Count('id'))

        # Prepare response data
        student_data = []
        for student in students:
            student_attendance = {entry['status']: entry['count'] for entry in attendance_records if entry['student_id'] == student.id}
            student_data.append({
                "student_id": student.id,
                "name": student.name,
                "present": student_attendance.get("Present", 0),
                "absent": student_attendance.get("Absent", 0),
                "not_marked": student_attendance.get("N/A", 0)
            })

        return Response(student_data, status=200)

    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM (e.g., 2025-03)"}, status=400)
    except Exception as e:
        logger.error(f"Error in get_student_attendance_counts: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_achieved_topics_count(request):
    """
    Fetch count of distinct achieved topics for students in a given month, school, and class.
    Parameters: month (YYYY-MM), school_id, student_class
    """
    user = request.user
    month = request.GET.get('month')  # Format: YYYY-MM
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')

    # Validate parameters
    if not all([month, school_id, student_class]):
        return Response({"error": "month, school_id, and student_class are required"}, status=400)

    try:
        # Parse month to get date range
        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1).date()
        end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()

        # Filter students by school and class
        students = Student.objects.filter(
            school_id=school_id,
            student_class=student_class,
            status="Active"
        )

        # Restrict to teacher's assigned schools if role is Teacher
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Fetch attendance records with achieved topics for the month
        achieved_topics = Attendance.objects.filter(
            student__in=students,
            session_date__range=[start_date, end_date],
            achieved_topic__isnull=False,  # Ensure not null
        ).exclude(achieved_topic='')  # Exclude empty strings directly
        achieved_topics = achieved_topics.values('student_id').annotate(topics_count=Count('achieved_topic', distinct=True))

        # Prepare response data
        student_data = []
        for student in students:
            topics_count = next((item['topics_count'] for item in achieved_topics if item['student_id'] == student.id), 0)
            student_data.append({
                "student_id": student.id,
                "name": student.name,
                "topics_achieved": topics_count
            })

        return Response(student_data, status=200)

    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM (e.g., 2025-03)"}, status=400)
    except Exception as e:
        logger.error(f"Error in get_student_achieved_topics_count: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_image_uploads_count(request):
    """
    Fetch count of images uploaded for students in a given month, school, and class from Supabase.
    Parameters: month (YYYY-MM), school_id, student_class
    """
    user = request.user
    month = request.GET.get('month')  # Format: YYYY-MM
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')

    # Validate parameters
    if not all([month, school_id, student_class]):
        return Response({"error": "month, school_id, and student_class are required"}, status=400)

    try:
        # Filter students by school and class
        students = Student.objects.filter(
            school_id=school_id,
            student_class=student_class,
            status="Active"
        )

        # Restrict to teacher's assigned schools if role is Teacher
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Prepare response data
        student_data = []
        for student in students:
            # Fetch images from Supabase for this student
            folder_path = f"{student.id}/"
            response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)

            if "error" in response:
                logger.error(f"Error fetching images for student {student.id}: {response['error']['message']}")
                continue

            # Filter images by month (filename starts with YYYY-MM)
            image_count = sum(1 for file in response if file['name'].startswith(month))

            student_data.append({
                "student_id": student.id,
                "name": student.name,
                "images_uploaded": image_count
            })

        return Response(student_data, status=200)

    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM (e.g., 2025-03)"}, status=400)
    except Exception as e:
        logger.error(f"Error in get_student_image_uploads_count: {str(e)}")
        return Response({"error": str(e)}, status=500)