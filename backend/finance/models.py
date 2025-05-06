from django.contrib.auth.models import User
from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.apps import apps
from students.models import School
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache  # Added for cache invalidation


User = get_user_model()


class FinanceModelBase(models.Model):
    """Base model to enforce role-based access control for finance module."""
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.created_by and self.created_by.role != "Admin":
            raise PermissionError("Only admins can create or modify finance records.")
        super().save(*args, **kwargs)


class Account(models.Model):
    ACCOUNT_TYPES = [
        ('Cash', 'Cash'),
        ('Bank', 'Bank'),
        ('Person', 'Person'),
    ]
    account_name = models.CharField(max_length=100, unique=True)
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPES)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.account_name} ({self.account_type})"


class IncomeDeleteView(APIView):
    def delete(self, request, pk):
        try:
            transaction = Transaction.objects.get(pk=pk, transaction_type="Income")
            if not request.user.is_authenticated or request.user.role != "Admin":
                return Response({"error": "Only admins can delete transactions."}, status=403)
            transaction.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('Income', 'Income'),
        ('Expense', 'Expense'),
        ('Transfer', 'Transfer'),
    ]

    date = models.DateField(null=True, blank=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100)
    from_account = models.ForeignKey(
        Account, related_name="outgoing_transactions", on_delete=models.SET_NULL, null=True, blank=True
    )
    to_account = models.ForeignKey(
        Account, related_name="incoming_transactions", on_delete=models.SET_NULL, null=True, blank=True
    )
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['transaction_type']),
            models.Index(fields=['category']),
            models.Index(fields=['school']),
            models.Index(fields=['from_account']),
            models.Index(fields=['to_account']),
            models.Index(fields=['date']),
            models.Index(fields=['transaction_type', 'category']),
            models.Index(fields=['school', 'date']),
        ]

    def save(self, *args, **kwargs):
        with transaction.atomic():
            original_transaction = None
            if self.pk:
                original_transaction = Transaction.objects.get(pk=self.pk)

            super().save(*args, **kwargs)

            # Update account balances incrementally
            if self.category == "Loan Received" and self.from_account and self.to_account:
                self.from_account.current_balance -= self.amount
                self.to_account.current_balance += self.amount
                self.from_account.save(update_fields=['current_balance', 'last_updated'])
                self.to_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.category == "Loan Paid" and self.from_account and self.to_account:
                self.from_account.current_balance -= self.amount
                self.to_account.current_balance += self.amount
                self.from_account.save(update_fields=['current_balance', 'last_updated'])
                self.to_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.transaction_type == "Income" and self.to_account:
                self.to_account.current_balance += self.amount
                self.to_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.transaction_type == "Expense" and self.from_account:
                self.from_account.current_balance -= self.amount
                self.from_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.transaction_type == "Transfer" and self.from_account and self.to_account:
                self.from_account.current_balance -= self.amount
                self.to_account.current_balance += self.amount
                self.from_account.save(update_fields=['current_balance', 'last_updated'])
                self.to_account.save(update_fields=['current_balance', 'last_updated'])

            # Reverse original transaction effects (for updates)
            if original_transaction:
                if original_transaction.transaction_type == "Income" and original_transaction.to_account:
                    original_transaction.to_account.current_balance -= original_transaction.amount
                    original_transaction.to_account.save(update_fields=['current_balance', 'last_updated'])

                elif original_transaction.transaction_type == "Expense" and original_transaction.from_account:
                    original_transaction.from_account.current_balance += original_transaction.amount
                    original_transaction.from_account.save(update_fields=['current_balance', 'last_updated'])

                elif original_transaction.transaction_type == "Transfer" and original_transaction.from_account and original_transaction.to_account:
                    original_transaction.from_account.current_balance += original_transaction.amount
                    original_transaction.to_account.current_balance -= original_transaction.amount
                    original_transaction.from_account.save(update_fields=['current_balance', 'last_updated'])
                    original_transaction.to_account.save(update_fields=['current_balance', 'last_updated'])

                elif original_transaction.category == "Loan Received" and original_transaction.from_account and original_transaction.to_account:
                    original_transaction.from_account.current_balance += original_transaction.amount
                    original_transaction.to_account.current_balance -= original_transaction.amount
                    original_transaction.from_account.save(update_fields=['current_balance', 'last_updated'])
                    original_transaction.to_account.save(update_fields=['current_balance', 'last_updated'])

                elif original_transaction.category == "Loan Paid" and original_transaction.from_account and original_transaction.to_account:
                    original_transaction.from_account.current_balance += original_transaction.amount
                    original_transaction.to_account.current_balance -= original_transaction.amount
                    original_transaction.from_account.save(update_fields=['current_balance', 'last_updated'])
                    original_transaction.to_account.save(update_fields=['current_balance', 'last_updated'])

            # Cache invalidation
            cache.delete('finance_summary')
            cache.delete('loan_summary')

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            from_account = self.from_account
            to_account = self.to_account
            super().delete(*args, **kwargs)

            # Reverse balance updates
            if self.category == "Loan Received" and from_account and to_account:
                from_account.current_balance += self.amount
                to_account.current_balance -= self.amount
                from_account.save(update_fields=['current_balance', 'last_updated'])
                to_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.category == "Loan Paid" and from_account and to_account:
                from_account.current_balance += self.amount
                to_account.current_balance -= self.amount
                from_account.save(update_fields=['current_balance', 'last_updated'])
                to_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.transaction_type == "Income" and to_account:
                to_account.current_balance -= self.amount
                to_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.transaction_type == "Expense" and from_account:
                from_account.current_balance += self.amount
                from_account.save(update_fields=['current_balance', 'last_updated'])

            elif self.transaction_type == "Transfer" and from_account and to_account:
                from_account.current_balance += self.amount
                to_account.current_balance -= self.amount
                from_account.save(update_fields=['current_balance', 'last_updated'])
                to_account.save(update_fields=['current_balance', 'last_updated'])

            # Cache invalidation
            cache.delete('finance_summary')
            cache.delete('loan_summary')

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} ({self.category}) - {self.school.name if self.school else 'No School'}"


class Loan(FinanceModelBase):
    borrower = models.CharField(max_length=100)
    loan_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Closed', 'Closed')], default='Active')
    notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        self.remaining_balance = self.loan_amount - self.paid_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.borrower} - {self.loan_amount} (Balance: {self.remaining_balance})"

    class Meta:
        ordering = ['-due_date']


class CategoryEntry(models.Model):
    CATEGORY_TYPES = (
        ('income', 'Income'),
        ('expense', 'Expense'),
    )

    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=10, choices=CATEGORY_TYPES)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.category_type})"