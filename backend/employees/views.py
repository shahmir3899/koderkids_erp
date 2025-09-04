from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from students.models import CustomUser
from employees.models import TeacherProfile
from employees.serializers import TeacherListSerializer, TeacherProfileSerializer
from datetime import datetime
from dateutil.relativedelta import relativedelta

class TeacherListView(APIView):
    permission_classes = ['rest_framework.permissions.IsAuthenticated']

    def get(self, request):
        teachers = CustomUser.objects.filter(role='Teacher')
        serializer = TeacherListSerializer(teachers, many=True)
        return Response(serializer.data)

class TeacherProfileView(APIView):
    permission_classes = ['rest_framework.permissions.IsAuthenticated']

    def get(self, request, teacher_id):
        try:
            user = CustomUser.objects.get(id=teacher_id, role='Teacher')
            profile = TeacherProfile.objects.get(user=user)
            serializer = TeacherProfileSerializer(profile)
            return Response(serializer.data)
        except (CustomUser.DoesNotExist, TeacherProfile.DoesNotExist):
            return Response({'error': 'Teacher or profile not found'}, status=status.HTTP_404_NOT_FOUND)

class DefaultDatesView(APIView):
    permission_classes = ['rest_framework.permissions.IsAuthenticated']

    def get(self, request):
        today = datetime.today()
        first_day = today.replace(day=1)
        last_day = (first_day + relativedelta(months=1) - relativedelta(days=1))
        return Response({
            'fromDate': first_day.strftime('%Y-%m-%d'),
            'tillDate': last_day.strftime('%Y-%m-%d'),
            'paymentDate': today.strftime('%Y-%m-%d'),
        })