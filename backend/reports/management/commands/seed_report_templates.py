"""
Management command to seed initial report templates.
Run: python manage.py seed_report_templates
"""
from django.core.management.base import BaseCommand
from reports.models import ReportTemplate


class Command(BaseCommand):
    help = 'Seed initial report templates for self-service reports'

    def handle(self, *args, **options):
        templates = [
            {
                'code': 'salary_certificate',
                'name': 'Salary Certificate',
                'description': 'Official salary certificate for bank loans, visa applications, etc.',
                'category': 'hr',
                'allowed_roles': ['Admin', 'Teacher', 'BDM'],
                'allowed_self_request': True,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Salary Certificate',
                'default_body': '''This is to certify that {employee_name} (Employee ID: {employee_id}) is currently employed with {company_name} as {designation} since {date_of_joining}.

Their current monthly salary is PKR {basic_salary}/- (Rupees {salary_in_words} only).

This certificate is being issued upon the request of the employee for {purpose}.

For any verification, please contact our HR department.''',
                'is_active': True,
            },
            {
                'code': 'experience_letter',
                'name': 'Experience Letter',
                'description': 'Letter confirming employment duration and role.',
                'category': 'hr',
                'allowed_roles': ['Admin', 'Teacher', 'BDM'],
                'allowed_self_request': True,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Experience Letter',
                'default_body': '''This is to certify that {employee_name} (Employee ID: {employee_id}) has been employed with {company_name} from {date_of_joining} to {date_of_leaving}.

During their tenure, they worked as {designation} and performed their duties satisfactorily.

We wish them all the best in their future endeavors.''',
                'is_active': True,
            },
            {
                'code': 'offer_letter',
                'name': 'Offer Letter',
                'description': 'Employment offer letter for new hires.',
                'category': 'hr',
                'allowed_roles': ['Admin'],
                'allowed_self_request': False,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Offer of Employment',
                'default_body': '''Dear {employee_name},

We are pleased to offer you the position of {designation} at {company_name}.

Your employment will commence on {start_date} with a monthly salary of PKR {basic_salary}/-.

Please confirm your acceptance of this offer by signing and returning this letter.

We look forward to welcoming you to our team.''',
                'is_active': True,
            },
            {
                'code': 'warning_letter',
                'name': 'Warning Letter',
                'description': 'Formal warning letter for policy violations.',
                'category': 'hr',
                'allowed_roles': ['Admin'],
                'allowed_self_request': False,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Warning Letter',
                'default_body': '''Dear {employee_name},

This letter serves as a formal warning regarding {reason}.

This behavior is unacceptable and violates company policy. Further incidents may result in more severe disciplinary action, up to and including termination.

Please acknowledge receipt of this letter by signing below.''',
                'is_active': True,
            },
            {
                'code': 'termination_letter',
                'name': 'Termination Letter',
                'description': 'Employment termination notice.',
                'category': 'hr',
                'allowed_roles': ['Admin'],
                'allowed_self_request': False,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Notice of Termination',
                'default_body': '''Dear {employee_name},

We regret to inform you that your employment with {company_name} is being terminated effective {termination_date}.

Reason: {reason}

Please contact HR to arrange the return of company property and to discuss your final settlement.''',
                'is_active': True,
            },
            {
                'code': 'appreciation_letter',
                'name': 'Appreciation Letter',
                'description': 'Letter recognizing employee achievements.',
                'category': 'hr',
                'allowed_roles': ['Admin'],
                'allowed_self_request': False,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Letter of Appreciation',
                'default_body': '''Dear {employee_name},

We are delighted to recognize your outstanding contribution to {achievement}.

Your dedication and hard work have not gone unnoticed. You continue to be a valuable asset to our team.

Keep up the excellent work!''',
                'is_active': True,
            },
            {
                'code': 'employment_certificate',
                'name': 'Employment Certificate',
                'description': 'Certificate confirming current employment status.',
                'category': 'hr',
                'allowed_roles': ['Admin', 'Teacher', 'BDM'],
                'allowed_self_request': True,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Employment Certificate',
                'default_body': '''TO WHOM IT MAY CONCERN

This is to certify that {employee_name} (Employee ID: {employee_id}) is currently employed with {company_name} as {designation}.

They joined our organization on {date_of_joining} and continue to be in our employment as of the date of this letter.

This certificate is issued upon the request of the employee.''',
                'is_active': True,
            },
            {
                'code': 'recommendation_letter',
                'name': 'Recommendation Letter',
                'description': 'Letter recommending an employee for external opportunities.',
                'category': 'hr',
                'allowed_roles': ['Admin', 'Teacher'],
                'allowed_self_request': True,
                'allowed_other_request': True,
                'requires_target_employee': True,
                'requires_target_school': False,
                'default_subject': 'Letter of Recommendation',
                'default_body': '''TO WHOM IT MAY CONCERN

I am pleased to recommend {employee_name} who worked with us at {company_name} as {designation} from {date_of_joining} to {date_of_leaving}.

During their time with us, they demonstrated excellent {skills} and maintained a positive attitude.

I highly recommend them for any position they are seeking and believe they will be a valuable addition to any organization.''',
                'is_active': True,
            },
            {
                'code': 'custom',
                'name': 'Custom Report',
                'description': 'Custom letter/report with flexible content.',
                'category': 'other',
                'allowed_roles': ['Admin'],
                'allowed_self_request': False,
                'allowed_other_request': True,
                'requires_target_employee': False,
                'requires_target_school': False,
                'default_subject': '',
                'default_body': '',
                'is_active': True,
            },
        ]

        created_count = 0
        updated_count = 0

        for template_data in templates:
            template, created = ReportTemplate.objects.update_or_create(
                code=template_data['code'],
                defaults=template_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated template: {template.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! Created: {created_count}, Updated: {updated_count}'
            )
        )
