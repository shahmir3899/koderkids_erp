"""
One-time script to bulk upload transactions to the school management system.

Usage:
    python bulk_upload_transactions.py --dry-run    # Preview what will be uploaded
    python bulk_upload_transactions.py              # Actually upload
"""

import requests
from datetime import datetime
import argparse

# ============================================
# CONFIGURATION
# ============================================
API_BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = f"{API_BASE_URL}/api/auth/token/"
BULK_EXPENSE_ENDPOINT = f"{API_BASE_URL}/api/transactions/expense/bulk/"
BULK_INCOME_ENDPOINT = f"{API_BASE_URL}/api/transactions/income/bulk/"

# Your admin credentials
USERNAME = "shahmir3899"
PASSWORD = "No@Sorry&703"

# ============================================
# ACCOUNT IDs (from your database)
# ============================================
# ID 2 = Shah Mir (Person) with balance -348,939
# ID 3 = Bank Islami (Bank) with balance 140,290
# ID 5 = Mohsin (Person)
# ID 6 = Shah Mir (Cash)

SHAH_MIR_PERSON_ID = 2   # The account with -348,939 balance

# ============================================
# SCHOOL IDs (from your database)
# ============================================
# ID 1 = The Generation Pre Cadet School
# ID 2 = The Creative School
# ID 11 = The Smart School, Soan Garden

GENERATION_SCHOOL_ID = 1
CREATIVE_SCHOOL_ID = 2
SMART_SCHOOL_ID = 11

# ============================================
# CATEGORY MAPPINGS
# ============================================
# Your data categories → Existing categories
EXPENSE_CATEGORY_MAP = {
    "Salaries": "Salaries",
    "Books": "Books",
    "Marketing": "Marketing",
    "Utilities": "Utilities",
    "Adm": "Other Expense",        # "Adm" doesn't exist, map to Other Expense
    "": "Other Expense",           # Empty category
}

INCOME_CATEGORY_MAP = {
    "": "School Invoice",          # Default for income
    "School Invoice": "School Invoice",
    "Books": "Books",              # Books income exists in income categories
}

# ============================================
# RAW TRANSACTION DATA
# ============================================
# Format: (date, amount, description, category, school_id_for_income)
# - Positive amounts = Expense
# - Negative amounts = Income (need school_id)

RAW_TRANSACTIONS = [
    # ============================================
    # DEC 2025 - NEW ENTRIES (duplicates removed)
    # ============================================
    # INCOMES from Dec 2025
    ("31/12/2025", -35000.0, "smart school soan garden fee", "School Invoice", SMART_SCHOOL_ID),
    ("17/12/2025", -25900.0, "gen Nov and Dec fee", "School Invoice", GENERATION_SCHOOL_ID),

    # EXPENSES from Dec 2025 (4 duplicates removed: 450, 6000, 2100, 24500)
    ("20/12/2025", 400.0, "50 books to MaZEN school book2", "Books", None),
    ("20/12/2025", 500.0, "bykea extension boards", "", None),
    ("15/12/2025", 300.0, "bykea mouse to maaz", "", None),
    ("15/12/2025", 2000.0, "extension board baqaya", "", None),
    ("13/12/2025", 5000.0, "extension board", "", None),
    ("12/12/2025", 1000.0, "", "", None),
    ("11/12/2025", 1000.0, "usman", "Salaries", None),
    # SKIPPED (duplicate): ("12/12/2025", 450.0) - already exists
    # SKIPPED (duplicate): ("11/12/2025", 6000.0, "5 Arduino pack") - already exists
    # SKIPPED (duplicate): ("11/12/2025", 2100.0, "bag anees") - already exists
    # SKIPPED (duplicate): ("11/12/2025", -24500.0, "books 35") - already exists as income

    # ============================================
    # JAN-FEB 2026 - ALL NEW ENTRIES
    # ============================================
    # EXPENSES
    ("04/02/2026", 5000.0, "anees", "Salaries", None),
    ("01/02/2026", 25000.0, "Usman BDM salary", "Salaries", None),
    ("31/01/2026", 30000.0, "numan book 1 baqay 500copies", "Books", None),
    ("28/01/2026", 800.0, "delivery books book 1 494 copies", "Books", None),
    ("28/01/2026", 200.0, "bdm", "Marketing", None),
    ("27/01/2026", 800.0, "", "Marketing", None),
    ("24/01/2026", 1000.0, "", "Marketing", None),
    ("21/01/2026", 1200.0, "monitoring visit", "Marketing", None),
    ("19/01/2026", 1000.0, "monitoring visit", "Adm", None),
    ("13/01/2026", 29125.0, "Claude AI", "Utilities", None),
    ("10/01/2026", 7000.0, "calender", "Utilities", None),
    ("05/01/2026", 7324.0, "render", "Adm", None),
    ("05/01/2026", 1000.0, "phone package", "Marketing", None),

    # INCOMES
    ("28/01/2026", -20000.0, "generation fee", "School Invoice", GENERATION_SCHOOL_ID),
    ("21/01/2026", -42000.0, "49k Books", "Books", SMART_SCHOOL_ID),
    ("21/01/2026", -7000.0, "49k Books", "Books", SMART_SCHOOL_ID),
    ("21/01/2026", -8500.0, "creative fee", "School Invoice", CREATIVE_SCHOOL_ID),
    ("09/01/2026", -13700.0, "the creative school", "School Invoice", CREATIVE_SCHOOL_ID),
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def parse_date(date_str):
    """Convert DD/MM/YYYY to YYYY-MM-DD format."""
    dt = datetime.strptime(date_str, "%d/%m/%Y")
    return dt.strftime("%Y-%m-%d")


def get_auth_token(username, password):
    """Login and get authentication token."""
    try:
        response = requests.post(LOGIN_ENDPOINT, json={
            "username": username,
            "password": password
        })
        response.raise_for_status()
        data = response.json()
        return data.get("access") or data.get("token")
    except requests.exceptions.RequestException as e:
        print(f"Login failed: {e}")
        return None


def prepare_transactions(raw_data):
    """
    Parse raw transaction data and separate into income/expense.
    Returns: (expenses_list, incomes_list)
    """
    expenses = []
    incomes = []

    for row in raw_data:
        date_str, amount, description, category, school_id = row
        parsed_date = parse_date(date_str)

        if amount < 0:
            # Negative amount = Income
            mapped_category = INCOME_CATEGORY_MAP.get(category, "School Invoice")
            income_data = {
                "date": parsed_date,
                "amount": str(abs(amount)),  # Convert to positive
                "category": mapped_category,
                "notes": description,
                "to_account": SHAH_MIR_PERSON_ID,  # Money goes TO this account
            }
            if school_id:
                income_data["school"] = school_id
            incomes.append(income_data)
        else:
            # Positive amount = Expense
            mapped_category = EXPENSE_CATEGORY_MAP.get(category, "Other Expense")
            expenses.append({
                "date": parsed_date,
                "amount": str(amount),
                "category": mapped_category,
                "notes": description,
                "from_account": SHAH_MIR_PERSON_ID,  # Money comes FROM this account
            })

    return expenses, incomes


def upload_transactions(token, endpoint, transactions, dry_run=False):
    """Upload transactions to the API."""
    if not transactions:
        return {"message": "No transactions to upload"}

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {"transactions": transactions}

    if dry_run:
        return {"dry_run": True, "would_upload": transactions}

    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "response": getattr(e.response, 'text', None)}


def print_transactions_table(transactions, title):
    """Pretty print transactions in a table format."""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}")
    print(f"{'Date':<12} {'Amount':>12} {'Category':<18} {'School':>6} {'Notes':<25}")
    print(f"{'-'*12} {'-'*12} {'-'*18} {'-'*6} {'-'*25}")

    total = 0
    for txn in transactions:
        amount = float(txn['amount'])
        total += amount
        notes = (txn.get('notes', '') or '')[:23]
        category = (txn.get('category', '') or '')[:16]
        school = str(txn.get('school', '-'))
        print(f"{txn['date']:<12} {amount:>12,.2f} {category:<18} {school:>6} {notes:<25}")

    print(f"{'-'*12} {'-'*12} {'-'*18} {'-'*6} {'-'*25}")
    print(f"{'TOTAL':<12} {total:>12,.2f}")
    print()


# ============================================
# MAIN SCRIPT
# ============================================

def main():
    parser = argparse.ArgumentParser(description='Bulk upload transactions')
    parser.add_argument('--dry-run', action='store_true',
                       help='Preview transactions without uploading')
    parser.add_argument('--username', default=USERNAME,
                       help='Admin username')
    parser.add_argument('--password', default=PASSWORD,
                       help='Admin password')
    args = parser.parse_args()

    print("\n" + "="*80)
    print(" BULK TRANSACTION UPLOAD SCRIPT")
    print("="*80)
    print(f"\n Account: Shah Mir (Person) - ID {SHAH_MIR_PERSON_ID}")
    print(f" Current Balance: PKR -348,939")

    # Parse and prepare transactions
    expenses, incomes = prepare_transactions(RAW_TRANSACTIONS)

    # Display what will be uploaded
    print_transactions_table(expenses, f"EXPENSES ({len(expenses)} transactions)")
    print_transactions_table(incomes, f"INCOMES ({len(incomes)} transactions)")

    if args.dry_run:
        print("\n[DRY RUN MODE] No transactions were uploaded.")
        print("Remove --dry-run flag to actually upload.\n")
        return

    # Get auth token
    print("Logging in...")
    token = get_auth_token(args.username, args.password)
    if not token:
        print("ERROR: Could not authenticate. Check your credentials.")
        return
    print("Login successful!\n")

    # Upload expenses
    if expenses:
        print(f"Uploading {len(expenses)} expenses...")
        result = upload_transactions(token, BULK_EXPENSE_ENDPOINT, expenses)
        if "error" in result:
            print(f"ERROR uploading expenses: {result}")
        else:
            print(f"SUCCESS: {result}")

    # Upload incomes
    if incomes:
        print(f"\nUploading {len(incomes)} incomes...")
        result = upload_transactions(token, BULK_INCOME_ENDPOINT, incomes)
        if "error" in result:
            print(f"ERROR uploading incomes: {result}")
        else:
            print(f"SUCCESS: {result}")

    print("\nDone!")


if __name__ == "__main__":
    main()
