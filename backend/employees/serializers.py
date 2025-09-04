from rest_framework import serializers
from students.models import CustomUser, School
from employees.models import TeacherProfile, TeacherEarning, TeacherDeduction

class TeacherEarningSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherEarning
        fields = ['category', 'amount']

class TeacherDeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherDeduction
        fields = ['category', 'amount']

class TeacherProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.get_full_name', read_only=True)
    schools = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='name',
        source='user.assigned_schools'
    )
    earnings = TeacherEarningSerializer(many=True, read_only=True, source='user.earnings')
    deductions = TeacherDeductionSerializer(many=True, read_only=True, source='user.deductions')

    class Meta:
        model = TeacherProfile
        fields = ['name', 'title', 'schools', 'date_of_joining', 'basic_salary', 'bank_name', 'account_number', 'earnings', 'deductions']

class TeacherListSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'name']