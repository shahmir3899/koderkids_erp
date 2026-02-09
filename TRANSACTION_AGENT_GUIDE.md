# Transaction Reconciliation AI Agent

## Overview

The Transaction Reconciliation AI Agent is an intelligent assistant integrated into the Transactions page that helps you reconcile bank statements with your database records. It can parse bank statements from various file formats, compare balances, identify missing transactions, and execute reconciliation actions.

---

## Capabilities

### 1. File Upload & Parsing
- **PDF Statements**: Extracts transactions from PDF bank statements (optimized for Bank Islami format)
- **Excel Files**: Parses `.xlsx` and `.xls` files with auto-column detection
- **CSV Files**: Handles comma-separated value files
- **Images**: OCR-based extraction from `.png`, `.jpg`, `.jpeg` files

**Extracted Data:**
- Account name and number
- Opening and closing balances
- Statement period (from/to dates)
- Individual transactions (date, description, withdrawal, deposit, balance)
- Summary totals

### 2. Balance Comparison
- Compare bank statement closing balance with database balance
- Identify discrepancies between records
- Show detailed mismatch information

### 3. Missing Entry Detection
- Find transactions in statement that aren't in the database
- Filter by date range
- Compare transaction counts and totals

### 4. Account Reconciliation
- Preview changes before applying
- Update account balance to match statement
- Add missing transactions to database
- Requires confirmation for write operations

### 5. Transaction Viewing
- List recent transactions for any account
- Filter by date range
- View account details and statistics

---

## How to Use

### Accessing the Agent

1. Navigate to **Transactions Management** page
2. Expand the **"Reconciliation Agent"** collapsible section at the top
3. The chat interface will appear with quick action buttons

### Method 1: Drag & Drop File Upload

Simply drag a bank statement file (PDF, Excel, CSV, or Image) into the chat area. The agent will:
1. Parse the file automatically
2. Extract all transactions and balances
3. Display a summary
4. Suggest next steps

### Method 2: Quick Action Templates

Click on any template button to use predefined actions:

| Button | Action |
|--------|--------|
| **Upload Statement** | Opens file picker to select a bank statement |
| **Compare Balance** | Compare an account's balance with statement value |
| **Find Missing** | Search for transactions not in database |
| **Transactions** | View recent transactions for an account |
| **Update Balance** | Manually set an account's balance |
| **Accounts** | List all accounts with current balances |

### Method 3: Natural Language Commands

Type commands in plain English:

#### File Upload
```
"Upload my Bank Islami statement"
"Parse this PDF"
```

#### Balance Comparison
```
"Compare Bank Islami balance with 165,290"
"Check if Shah Mir balance matches 50,000"
"Verify the bank balance"
```

#### Find Missing Entries
```
"Find missing entries for Bank Islami"
"What transactions are missing from January to March?"
"Show differences for Shah Mir account"
```

#### View Transactions
```
"Show last 20 transactions for Bank Islami"
"List transactions for Shah Mir from 2025-01-01 to 2025-06-30"
"View recent activity"
```

#### Update Balance
```
"Update Bank Islami balance to 165,290"
"Set Shah Mir balance to 50,000"
"Correct the petty cash balance"
```

#### Reconciliation
```
"Preview reconciliation for Bank Islami"
"Apply the changes"
"Fix the balance mismatch"
"Reconcile the account"
```

#### Account Info
```
"List all accounts"
"Show account details for Bank Islami"
"What accounts do we have?"
```

---

## Typical Workflow

### Scenario: Monthly Bank Statement Reconciliation

**Step 1: Upload Statement**
```
Drag & drop your bank statement PDF into the chat
```
*Agent responds with parsed data: closing balance, transaction count, etc.*

**Step 2: Compare Balance**
```
"Compare balance with the statement"
```
*Agent shows: Database balance vs Statement balance, highlights any mismatch*

**Step 3: Find Missing Entries (if mismatch exists)**
```
"Find missing transactions"
```
*Agent lists transactions that exist in statement but not in database*

**Step 4: Preview Changes**
```
"Preview reconciliation"
```
*Agent shows what will be changed without making modifications*

**Step 5: Execute Reconciliation**
```
"Apply the changes"
```
*Agent asks for confirmation, then updates the database*

---

## Account Name Matching

The agent uses fuzzy matching for account names:

| You can say... | Matches... |
|----------------|------------|
| "Bank Islami", "islami", "early birds", "EB" | Bank Islami account |
| "Shah Mir" | Shah Mir account |
| "Petty cash", "cash" | Petty Cash account |

If the agent can't determine which account you mean, it will ask for clarification.

---

## Confirmation Required Actions

These actions require explicit confirmation before execution:

- **Execute Reconciliation** - Creates transactions and updates balances
- **Update Account Balance** - Modifies account balance directly

When prompted, click **Confirm** to proceed or **Cancel** to abort.

---

## Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Best for Bank Islami statements |
| Excel | `.xlsx`, `.xls` | Auto-detects column mappings |
| CSV | `.csv` | Comma-separated values |
| Images | `.png`, `.jpg`, `.jpeg` | Uses OCR (requires Tesseract) |

### Excel/CSV Column Detection

The agent automatically detects these columns:
- **Date**: "date", "txn date", "transaction date", "value date"
- **Description**: "description", "narration", "particulars", "details"
- **Withdrawal**: "withdrawal", "debit", "dr", "debit amount"
- **Deposit**: "deposit", "credit", "cr", "credit amount"
- **Balance**: "balance", "running balance", "closing balance"

---

## Voice Support

The agent supports voice input and output:
- **Voice Input**: Click the microphone icon to speak commands
- **Voice Output**: Bot responses are automatically read aloud (can be disabled)

---

## Troubleshooting

### File Upload Fails
- Ensure file is one of the supported formats
- Check file size (large files may take longer)
- For images, ensure text is clearly visible

### Balance Comparison Shows Unexpected Results
- Verify you selected the correct account
- Check the statement closing balance value
- Ensure the statement date matches your records

### Missing Entries Not Found
- Specify a date range that matches your statement
- Some transactions may have different dates in statement vs database

### Reconciliation Fails
- Check for duplicate transactions
- Verify account permissions
- Review the preview before executing

---

## API Endpoints (For Developers)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/upload/` | POST | Upload and parse bank statement file |
| `/api/ai/execute/` | POST | Execute agent command (agent: "transaction") |
| `/api/ai/confirm/` | POST | Confirm pending action |

### Context Structure
```javascript
{
  current_date: "2025-01-15",
  accounts: [
    { id: 1, account_name: "Bank Islami", account_type: "Bank", current_balance: 165290 },
    { id: 2, account_name: "Shah Mir", account_type: "Person", current_balance: 50000 }
  ]
}
```

---

## Technical Requirements

### Backend Dependencies
```
pdfplumber>=0.10.0    # PDF parsing
pandas                # Excel/CSV parsing (already installed)
openpyxl              # Excel support (already installed)
Pillow                # Image handling (already installed)
pytesseract           # OCR for images (optional)
```

### For Image OCR (Optional)
Install Tesseract OCR: https://github.com/tesseract-ocr/tesseract

---

## Files Created/Modified

| File | Description |
|------|-------------|
| `backend/ai/file_parser.py` | Bank statement parsing service |
| `backend/ai/actions.py` | Transaction action definitions |
| `backend/ai/prompts.py` | LLM system prompt |
| `backend/ai/executor.py` | Action execution logic |
| `backend/ai/views.py` | File upload endpoint |
| `frontend/src/components/transactions/TransactionAgentChat.js` | Chat UI component |
| `frontend/src/services/aiService.js` | API service functions |
| `frontend/src/pages/TransactionsPage.js` | Page integration |

---

## Example Conversations

### Example 1: Quick Balance Check
```
User: "What's the Bank Islami balance?"
Agent: Bank Islami - Current database balance: PKR 165,290

User: "Compare with 170,000"
Agent: Balance Comparison: Bank Islami
       Database Balance: PKR 165,290
       Statement Balance: PKR 170,000
       Difference: PKR 4,710 (Statement higher)

       Would you like to:
       - Find missing entries
       - Update balance
```

### Example 2: Full Reconciliation Flow
```
User: [Drops PDF file]
Agent: Statement Parsed Successfully
       Account: Early Birds Koder Kids
       Closing Balance: PKR 170,000
       Transactions Found: 45

User: "Compare balance"
Agent: Balance mismatch detected! PKR 4,710 difference

User: "Find missing"
Agent: Found 3 transactions in statement not in database:
       - 2025-01-05: Deposit PKR 2,000
       - 2025-01-10: Deposit PKR 1,500
       - 2025-01-12: Deposit PKR 1,210

User: "Reconcile"
Agent: [Confirmation Required]
       This will:
       - Add 3 transactions
       - Update balance to PKR 170,000

       [Confirm] [Cancel]

User: [Clicks Confirm]
Agent: Reconciliation Complete!
       - Balance updated
       - 3 transactions created
```

---

## Best Practices

1. **Always preview before executing** - Review changes before applying
2. **Use date ranges** - Narrow down searches for faster results
3. **Verify account selection** - Ensure you're working with the correct account
4. **Regular reconciliation** - Reconcile monthly for best accuracy
5. **Keep statements organized** - Use clear file names for uploaded statements

---

*Last Updated: February 2026*
