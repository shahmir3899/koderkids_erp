from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.apps import apps
from students.models import School
from django.db.models import Sum  # ✅ Import Sum for aggregating totals
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


User = get_user_model()  # Use custom user model if exists

class FinanceModelBase(models.Model):
    """Base model to enforce role-based access control for finance module."""
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        abstract = True  # Ensure this is not a database table

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

    def update_balance(self):
        """Recalculate and update the account balance dynamically."""
        total_receipts = Transaction.objects.filter(to_account=self).aggregate(Sum("amount"))["amount__sum"] or 0
        total_payments = Transaction.objects.filter(from_account=self).aggregate(Sum("amount"))["amount__sum"] or 0
        self.current_balance = total_receipts - total_payments
        self.save(update_fields=["current_balance"])  # ✅ Save only the balance update
        print(f"Balance updated: {self.account_name} | New Balance: {self.current_balance}")  # Debugging log


    def __str__(self):
        return f"{self.account_name} ({self.account_type})"

class IncomeDeleteView(APIView):
    def delete(self, request, pk):
        try:
            transaction = Transaction.objects.get(pk=pk, transaction_type="Income")
            # Optional: Add permission check
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

    date = models.DateField(null=True, blank=True)  # ✅ Allows custom date, no auto overwrite

    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100)
    from_account = models.ForeignKey(
        Account, related_name="outgoing_transactions", on_delete=models.SET_NULL, null=True, blank=True
    )  # Only used for expenses & transfers
    to_account = models.ForeignKey(
        Account, related_name="incoming_transactions", on_delete=models.SET_NULL, null=True, blank=True
    )  # Only used for income & transfers
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True)  # ✅ Optional school field
    notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # Debug logs
        print(f"Saving Transaction: {self.transaction_type} | Amount: {self.amount} | Category: {self.category}")

        # ✅ If it's Loan Received, update both accounts
        if self.category == "Loan Received" and self.to_account and self.from_account:
            print(f"Updating balances: From {self.from_account.account_name} → To {self.to_account.account_name}")
            self.from_account.update_balance()
            self.to_account.update_balance()

        # ✅ If it's Loan Paid, update both accounts
        elif self.category == "Loan Paid" and self.from_account and self.to_account:
            print(f"Updating balances: From {self.from_account.account_name} → To {self.to_account.account_name}")
            self.from_account.update_balance()
            self.to_account.update_balance()

        # ✅ Existing logic for other transactions
        elif self.transaction_type == "Income" and self.to_account:
            self.to_account.update_balance()
        elif self.transaction_type == "Expense" and self.from_account:
            self.from_account.update_balance()
        elif self.transaction_type == "Transfer" and self.from_account and self.to_account:
            self.from_account.update_balance()
            self.to_account.update_balance()

    def delete(self, *args, **kwargs):
        from_account = self.from_account
        to_account = self.to_account
        super().delete(*args, **kwargs)
        if from_account:
            from_account.update_balance()
        if to_account:
            to_account.update_balance()

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
