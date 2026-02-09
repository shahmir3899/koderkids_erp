from django.contrib.auth.models import User
from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.apps import apps
from students.models import School
from django.db.models import Sum, F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from decimal import Decimal


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

    def _update_account_balance(self, account_id, amount_delta):
        """
        Atomically update account balance using F() expression.
        Single query, no race conditions.
        """
        if account_id:
            Account.objects.filter(pk=account_id).update(
                current_balance=F('current_balance') + amount_delta,
                last_updated=now()
            )

    def _apply_balance_changes(self, txn_type, category, from_acc_id, to_acc_id, amount, reverse=False):
        """
        Apply balance changes for a transaction.
        If reverse=True, reverses the effect (for updates/deletes).
        """
        multiplier = Decimal('-1') if reverse else Decimal('1')
        amt = Decimal(str(amount)) * multiplier

        # Loan transactions (both accounts affected)
        if category in ("Loan Received", "Loan Paid") and from_acc_id and to_acc_id:
            self._update_account_balance(from_acc_id, -amt)
            self._update_account_balance(to_acc_id, amt)

        # Income: credit to_account
        elif txn_type == "Income" and to_acc_id:
            self._update_account_balance(to_acc_id, amt)

        # Expense: debit from_account
        elif txn_type == "Expense" and from_acc_id:
            self._update_account_balance(from_acc_id, -amt)

        # Transfer: debit from_account, credit to_account
        elif txn_type == "Transfer" and from_acc_id and to_acc_id:
            self._update_account_balance(from_acc_id, -amt)
            self._update_account_balance(to_acc_id, amt)

    def _invalidate_cache(self):
        """Clear finance-related caches."""
        cache.delete('finance_summary')
        cache.delete('loan_summary')

    def save(self, *args, **kwargs):
        with transaction.atomic():
            # Fetch original for updates (to reverse old balance changes)
            original = None
            if self.pk:
                original = Transaction.objects.select_related(
                    'from_account', 'to_account'
                ).filter(pk=self.pk).first()

            # Save the transaction
            super().save(*args, **kwargs)

            # Reverse original transaction effects first (if updating)
            if original:
                self._apply_balance_changes(
                    original.transaction_type,
                    original.category,
                    original.from_account_id,
                    original.to_account_id,
                    original.amount,
                    reverse=True
                )

            # Apply new transaction balance changes
            self._apply_balance_changes(
                self.transaction_type,
                self.category,
                self.from_account_id,
                self.to_account_id,
                self.amount,
                reverse=False
            )

            self._invalidate_cache()

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            # Store IDs before deletion
            from_acc_id = self.from_account_id
            to_acc_id = self.to_account_id
            txn_type = self.transaction_type
            category = self.category
            amount = self.amount

            # Delete the transaction
            super().delete(*args, **kwargs)

            # Reverse the balance changes
            self._apply_balance_changes(
                txn_type,
                category,
                from_acc_id,
                to_acc_id,
                amount,
                reverse=True
            )

            self._invalidate_cache()

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