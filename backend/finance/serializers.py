from rest_framework import serializers
from .models import Transaction, Loan, Account, TransactionCategory

# ✅ Transaction Serializer: Ensures correct account selection
class TransactionSerializer(serializers.ModelSerializer):
    from_account_name = serializers.CharField(source='from_account.account_name', read_only=True)
    to_account_name = serializers.CharField(source='to_account.account_name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "date",
            "transaction_type",
            "category",
            "amount",
            "from_account",
            "from_account_name",  # Include account names
            "to_account",
            "to_account_name",    # Include account names
            "school",
            "notes"
        ]

    def validate(self, data):
        """
        Validate the transaction data before creation or update.
        Ensures required fields are present based on transaction type and category.
        """
        transaction_type = data.get("transaction_type")
        category = data.get("category")
        from_account = data.get("from_account")
        to_account = data.get("to_account")

        # Validation for Expense transactions
        if transaction_type == "Expense" and not from_account:
            raise serializers.ValidationError({"from_account": "From Account is required for Expense transactions."})

        # Validation for Loan Received (existing logic moved here)
        if category == "Loan Received":
            received_from = self.initial_data.get("received_from")
            if not received_from:
                raise serializers.ValidationError({"received_from": "Loan Received transactions must have a lender (Person)."})
            try:
                from_account = Account.objects.get(id=received_from, account_type="Person")
                data["from_account"] = from_account  # Assign lender as from_account
            except Account.DoesNotExist:
                raise serializers.ValidationError({"received_from": "The selected lender is not a valid Person account."})

        return data

    def create(self, validated_data):
        """
        Ensure transactions correctly link accounts and update balances.
        """
        # Extract necessary fields
        transaction_type = validated_data.get("transaction_type")
        category = validated_data.get("category")
        from_account = validated_data.get("from_account", None)
        to_account = validated_data.get("to_account", None)

        # Save transaction with validated data
        transaction = super().create(validated_data)

        # Update balances after transaction creation
        if transaction.from_account:
            transaction.from_account.update_balance()
        if transaction.to_account:
            transaction.to_account.update_balance()

        return transaction


class LoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = '__all__'

# ✅ Account Serializer: Supports multiple cash & bank accounts
class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'account_name', 'account_type', 'current_balance', 'last_updated']

    def create(self, validated_data):
        transaction_type = validated_data.get("transaction_type")
        category = validated_data.get("category")
        from_account = validated_data.get("from_account", None)
        to_account = validated_data.get("to_account", None)
        received_from = self.initial_data.get("received_from", None)

        if category == "Loan Received":
            if not received_from:
                raise serializers.ValidationError({"received_from": "Loan Received transactions must have a lender (Person)."})
            try:
                from_account = Account.objects.get(id=received_from, account_type="Person")
            except Account.DoesNotExist:
                raise serializers.ValidationError({"received_from": "The selected lender is not a valid Person account."})
        elif transaction_type == "Expense" and category == "Loan Paid" and (not from_account or not to_account):
            raise serializers.ValidationError({"from_account": "Both accounts must be selected for a Loan Paid transaction.", "to_account": "Both accounts must be selected for a Loan Paid transaction."})

        validated_data["to_account"] = to_account
        validated_data["from_account"] = from_account

        transaction = super().create(validated_data)

        if transaction.from_account:
            transaction.from_account.update_balance()
        if transaction.to_account:
            transaction.to_account.update_balance()

        return transaction

class TransactionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionCategory
        fields = ['id', 'name', 'category_type']
