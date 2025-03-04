from django.db import models

class Account(models.Model):
    name = models.CharField(max_length=100)  # Bank, Cash, Person
    account_type = models.CharField(max_length=50, choices=[('Bank', 'Bank'), ('Cash', 'Cash'), ('Person', 'Person')])
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return self.name

class Transaction(models.Model):
    TRANSACTION_TYPES = [('Payment', 'Payment'), ('Receipt', 'Receipt')]

    date = models.DateField(auto_now_add=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100)  # Salaries, Rent, Income, etc.
    source = models.ForeignKey(Account, related_name="source_transactions", on_delete=models.CASCADE)
    destination = models.ForeignKey(Account, related_name="destination_transactions", on_delete=models.CASCADE)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} on {self.date}"
