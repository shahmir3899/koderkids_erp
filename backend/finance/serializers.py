from rest_framework import serializers
from .models import Transaction, Account, CategoryEntry, Loan

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ["id", "account_name", "account_type", "current_balance", "last_updated"]

class TransactionSerializer(serializers.ModelSerializer):
    school_id = serializers.IntegerField(source="school.id", read_only=True)
    school_name = serializers.CharField(source="school.name", read_only=True)
    from_account_name = serializers.CharField(source="from_account.account_name", read_only=True)
    to_account_name = serializers.CharField(source="to_account.account_name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "date", "transaction_type", "amount", "category",
            "from_account", "to_account", "school", "notes",
            "school_id", "school_name", "from_account_name", "to_account_name"
        ]
        extra_kwargs = {
            "school": {"required": False, "allow_null": True},  # Make school optional
            "from_account": {"required": False, "allow_null": True},
            "to_account": {"required": False, "allow_null": True},
        }

class CategoryEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryEntry
        fields = ["id", "name", "category_type", "created_by", "created_at"]

class LoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = [
            "id", "borrower", "loan_amount", "paid_amount", "remaining_balance",
            "installment_amount", "due_date", "status", "notes", "created_by"
        ]


class BulkTransactionSerializer(serializers.Serializer):
    """
    Serializer for bulk transaction creation.
    Accepts an array of transaction objects.
    """
    transactions = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=100,  # Limit to prevent abuse
        help_text="List of transaction objects to create"
    )

    def validate_transactions(self, value):
        """Validate each transaction has required fields."""
        required_fields = {'amount', 'category', 'date'}

        for idx, txn in enumerate(value):
            missing = required_fields - set(txn.keys())
            if missing:
                raise serializers.ValidationError(
                    f"Transaction at index {idx} missing required fields: {missing}"
                )

            # Validate amount is positive
            if float(txn.get('amount', 0)) <= 0:
                raise serializers.ValidationError(
                    f"Transaction at index {idx} must have a positive amount"
                )

        return value