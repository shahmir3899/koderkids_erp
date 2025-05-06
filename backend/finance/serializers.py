from rest_framework import serializers
from .models import CategoryEntry, Transaction, Loan, Account
from students.models import School


class CategoryEntrySerializer(serializers.ModelSerializer):
    """Serializer for CategoryEntry model."""
    class Meta:
        model = CategoryEntry
        fields = ['id', 'name', 'category_type']


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model, using incrementally updated balances."""
    class Meta:
        model = Account
        fields = ['id', 'account_name', 'account_type', 'current_balance', 'last_updated']
        read_only_fields = ['current_balance', 'last_updated']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model, supporting paginated responses."""
    school_id = serializers.IntegerField(source='school.id', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    from_account_name = serializers.CharField(source='from_account.account_name', read_only=True, allow_null=True)
    to_account_name = serializers.CharField(source='to_account.account_name', read_only=True, allow_null=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'date', 'transaction_type', 'amount', 'category',
            'from_account', 'from_account_name', 'to_account', 'to_account_name',
            'school', 'school_id', 'school_name', 'notes'
        ]
        read_only_fields = ['school_id', 'school_name', 'from_account_name', 'to_account_name']

    def validate(self, data):
        """Custom validation for transaction fields."""
        transaction_type = data.get('transaction_type')
        from_account = data.get('from_account')
        to_account = data.get('to_account')
        category = data.get('category')
        amount = data.get('amount')

        # Ensure accounts are provided based on transaction type
        if transaction_type == 'Income' and not to_account:
            raise serializers.ValidationError({"to_account": "Income transactions require a 'to_account'."})
        if transaction_type == 'Expense' and not from_account:
            raise serializers.ValidationError({"from_account": "Expense transactions require a 'from_account'."})
        if transaction_type == 'Transfer' and (not from_account or not to_account):
            raise serializers.ValidationError({
                "from_account": "Transfer must have a source account.",
                "to_account": "Transfer must have a destination account."
            })
        if category in ['Loan Received', 'Loan Paid'] and (not from_account or not to_account):
            raise serializers.ValidationError({
                "from_account": "Loan transactions require a source account.",
                "to_account": "Loan transactions require a destination account."
            })

        # Validation for Loan Received (restore original logic)
        if category == 'Loan Received':
            received_from = self.initial_data.get('received_from')
            if not received_from:
                raise serializers.ValidationError({"received_from": "Loan Received transactions must have a lender (Person)."})
            try:
                from_account = Account.objects.get(id=received_from, account_type='Person')
                data['from_account'] = from_account
            except Account.DoesNotExist:
                raise serializers.ValidationError({"received_from": "The selected lender is not a valid Person account."})

        # Additional validations
        if amount <= 0:
            raise serializers.ValidationError({"amount": "Amount must be greater than zero."})
        if category and not CategoryEntry.objects.filter(
            name=category, category_type=transaction_type.lower()
        ).exists():
            raise serializers.ValidationError({"category": f"Category '{category}' is not valid for {transaction_type} transactions."})
        if not data.get('school'):
            raise serializers.ValidationError({"school": "School is required for all transactions."})

        return data


class LoanSerializer(serializers.ModelSerializer):
    """Serializer for Loan model."""
    class Meta:
        model = Loan
        fields = '__all__'