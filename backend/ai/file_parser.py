"""
Bank Statement File Parser
==========================
Parses bank statements from PDF, Excel, and Image files.
Extracts transactions, balances, and statement metadata.

Supported formats:
- PDF: Bank Islami format (table extraction)
- Excel: .xlsx, .xls, .csv (auto-detect columns)
- Images: .png, .jpg, .jpeg (OCR - optional)
"""

import re
import io
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class BankStatementParser:
    """
    Parse bank statements from various file formats.

    Usage:
        parser = BankStatementParser()
        result = parser.parse_file(file_obj, 'pdf')
        # result contains: account_name, closing_balance, transactions, etc.
    """

    def __init__(self):
        self.supported_formats = ['pdf', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg']

    def parse_file(self, file, file_type: str) -> Dict[str, Any]:
        """
        Parse uploaded file and extract bank statement data.

        Args:
            file: File object (from request.FILES or file path)
            file_type: File extension (pdf, xlsx, csv, png, etc.)

        Returns:
            {
                'success': bool,
                'account_name': str,
                'account_number': str,
                'opening_balance': Decimal,
                'closing_balance': Decimal,
                'statement_period': {'from': date, 'to': date},
                'transactions': [
                    {
                        'date': date,
                        'description': str,
                        'withdrawal': Decimal,
                        'deposit': Decimal,
                        'balance': Decimal
                    }
                ],
                'summary': {
                    'total_withdrawals': Decimal,
                    'total_deposits': Decimal,
                    'transaction_count': int
                }
            }
        """
        file_type = file_type.lower().strip('.')

        if file_type not in self.supported_formats:
            raise ValueError(f"Unsupported file type: {file_type}. Supported: {self.supported_formats}")

        try:
            if file_type == 'pdf':
                return self._parse_pdf(file)
            elif file_type in ['xlsx', 'xls']:
                return self._parse_excel(file)
            elif file_type == 'csv':
                return self._parse_csv(file)
            elif file_type in ['png', 'jpg', 'jpeg']:
                return self._parse_image(file)
        except Exception as e:
            logger.error(f"Error parsing {file_type} file: {str(e)}")
            raise

    def _parse_pdf(self, file) -> Dict[str, Any]:
        """
        Parse PDF bank statement using pdfplumber.
        Optimized for Bank Islami statement format.
        """
        try:
            import pdfplumber
        except ImportError:
            raise ImportError("pdfplumber is required for PDF parsing. Install with: pip install pdfplumber")

        transactions = []
        account_name = None
        account_number = None
        opening_balance = None
        closing_balance = None
        statement_from = None
        statement_to = None

        # Read file content
        if hasattr(file, 'read'):
            file_content = io.BytesIO(file.read())
            file.seek(0)  # Reset file pointer
        else:
            file_content = file

        with pdfplumber.open(file_content) as pdf:
            full_text = ""
            all_tables = []

            for page_num, page in enumerate(pdf.pages):
                # Extract text for metadata
                page_text = page.extract_text() or ""
                full_text += page_text + "\n"

                # Extract tables for transactions
                tables = page.extract_tables()
                for table in tables:
                    all_tables.extend(table)

            # Extract metadata from text
            account_name, account_number = self._extract_account_info(full_text)
            opening_balance = self._extract_opening_balance(full_text)
            closing_balance = self._extract_closing_balance(full_text)
            statement_from, statement_to = self._extract_statement_period(full_text)

            # Parse transaction rows from tables
            transactions = self._parse_transaction_tables(all_tables)

        # Calculate summary
        total_withdrawals = sum(t['withdrawal'] for t in transactions if t['withdrawal'])
        total_deposits = sum(t['deposit'] for t in transactions if t['deposit'])

        return {
            'success': True,
            'account_name': account_name,
            'account_number': account_number,
            'opening_balance': opening_balance,
            'closing_balance': closing_balance,
            'statement_period': {
                'from': statement_from,
                'to': statement_to
            },
            'transactions': transactions,
            'summary': {
                'total_withdrawals': total_withdrawals,
                'total_deposits': total_deposits,
                'transaction_count': len(transactions)
            }
        }

    def _extract_account_info(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract account name and number from statement text."""
        account_name = None
        account_number = None

        # Bank Islami format: "Account No : 312100062460001"
        acc_match = re.search(r'Account\s*(?:No|Number)\s*[:\s]+(\d{10,20})', text, re.IGNORECASE)
        if acc_match:
            account_number = acc_match.group(1)

        # Look for company name (usually in header)
        name_patterns = [
            r'EARLY\s+BIRD[S]?\s+KODER\s+KIDS[^A-Z]*(?:PRIVATE\s+)?(?:LIMITED)?',
            r'Account\s+Branch\s*:\s*([A-Z0-9\s\-]+)',
        ]
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                account_name = match.group(0).strip() if match.lastindex is None else match.group(1).strip()
                break

        # Default name if not found
        if not account_name:
            account_name = "Bank Islami Account"

        return account_name, account_number

    def _extract_opening_balance(self, text: str) -> Optional[Decimal]:
        """Extract opening balance from statement."""
        patterns = [
            r'Opening\s+Balance\s*(?:as\s+on)?[:\s]+(?:PKR\s+)?([0-9,]+\.?\d*)',
            r'Opening\s+Balance[:\s]+([0-9,]+\.?\d*)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return self._parse_amount(match.group(1))
        return None

    def _extract_closing_balance(self, text: str) -> Optional[Decimal]:
        """Extract closing balance from statement."""
        patterns = [
            r'Closing\s+Balance\s*(?:as\s+on)?[^0-9]*([0-9,]+\.?\d*)',
            r'Available\s+Balance\s*(?:as\s+on)?[^0-9]*([0-9,]+\.?\d*)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return self._parse_amount(match.group(1))
        return None

    def _extract_statement_period(self, text: str) -> Tuple[Optional[date], Optional[date]]:
        """Extract statement date range."""
        from_date = None
        to_date = None

        # Pattern: "From Date : 01-Jun-2025" "To Date : 18-Dec-2025"
        from_match = re.search(r'From\s*Date\s*[:\s]+(\d{1,2}[-/]\w{3}[-/]\d{4})', text, re.IGNORECASE)
        to_match = re.search(r'To\s*Date\s*[:\s]+(\d{1,2}[-/]\w{3}[-/]\d{4})', text, re.IGNORECASE)

        if from_match:
            from_date = self._parse_date(from_match.group(1))
        if to_match:
            to_date = self._parse_date(to_match.group(1))

        # Alternative: "01-09-2025 To Date 04-12-2025"
        if not from_date or not to_date:
            range_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+To\s+Date\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})', text, re.IGNORECASE)
            if range_match:
                from_date = self._parse_date(range_match.group(1))
                to_date = self._parse_date(range_match.group(2))

        return from_date, to_date

    def _parse_transaction_tables(self, table_rows: List[List]) -> List[Dict]:
        """Parse transaction rows from extracted tables."""
        transactions = []
        header_found = False

        for row in table_rows:
            if not row or len(row) < 3:
                continue

            # Clean row values
            row = [str(cell).strip() if cell else '' for cell in row]

            # Check if this is a header row
            row_text = ' '.join(row).lower()
            if 'date' in row_text and ('withdrawal' in row_text or 'debit' in row_text):
                header_found = True
                continue

            # Skip non-transaction rows
            if not header_found:
                continue

            # Try to parse as transaction
            txn = self._parse_transaction_row(row)
            if txn:
                transactions.append(txn)

        return transactions

    def _parse_transaction_row(self, row: List[str]) -> Optional[Dict]:
        """
        Parse a single transaction row.
        Expected format: [Date, Description, Withdrawal, Deposit, Balance]
        """
        if len(row) < 3:
            return None

        # Try to find date in first column
        txn_date = self._parse_date(row[0])
        if not txn_date:
            return None

        # Find amounts in row
        amounts = []
        description_parts = []

        for i, cell in enumerate(row):
            if i == 0:
                continue  # Skip date column

            amount = self._parse_amount(cell)
            if amount is not None:
                amounts.append((i, amount))
            elif cell and not cell.isdigit():
                description_parts.append(cell)

        # Need at least one amount (withdrawal, deposit, or balance)
        if not amounts:
            return None

        description = ' '.join(description_parts).strip()

        # Determine withdrawal, deposit, balance based on column positions
        withdrawal = None
        deposit = None
        balance = None

        if len(amounts) >= 3:
            # Format: Withdrawal, Deposit, Balance
            withdrawal = amounts[0][1] if amounts[0][1] > 0 else None
            deposit = amounts[1][1] if amounts[1][1] > 0 else None
            balance = amounts[2][1]
        elif len(amounts) == 2:
            # Could be: (Withdrawal/Deposit, Balance) or (Withdrawal, Deposit)
            if amounts[1][1] > amounts[0][1] * 10:  # Second is likely balance
                if amounts[0][1] > 0:
                    # Determine if withdrawal or deposit based on description
                    if 'clearing' in description.lower() or 'withdrawal' in description.lower():
                        withdrawal = amounts[0][1]
                    else:
                        deposit = amounts[0][1]
                balance = amounts[1][1]
            else:
                withdrawal = amounts[0][1] if amounts[0][1] > 0 else None
                deposit = amounts[1][1] if amounts[1][1] > 0 else None
        elif len(amounts) == 1:
            balance = amounts[0][1]

        return {
            'date': txn_date,
            'description': description[:200],  # Limit description length
            'withdrawal': withdrawal or Decimal('0'),
            'deposit': deposit or Decimal('0'),
            'balance': balance
        }

    def _parse_excel(self, file) -> Dict[str, Any]:
        """Parse Excel bank statement."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for Excel parsing. Install with: pip install pandas openpyxl")

        # Read Excel file
        if hasattr(file, 'read'):
            file_content = io.BytesIO(file.read())
            file.seek(0)
        else:
            file_content = file

        df = pd.read_excel(file_content)
        return self._parse_dataframe(df)

    def _parse_csv(self, file) -> Dict[str, Any]:
        """Parse CSV bank statement."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for CSV parsing.")

        if hasattr(file, 'read'):
            content = file.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8')
            file.seek(0)
            file_content = io.StringIO(content)
        else:
            file_content = file

        df = pd.read_csv(file_content)
        return self._parse_dataframe(df)

    def _parse_dataframe(self, df) -> Dict[str, Any]:
        """Parse pandas DataFrame to extract transactions."""
        import pandas as pd

        # Auto-detect columns
        col_map = self._detect_columns(df)

        if not col_map.get('date'):
            raise ValueError("Could not detect date column in file")

        transactions = []
        for _, row in df.iterrows():
            txn_date = self._parse_date(str(row[col_map['date']]))
            if not txn_date:
                continue

            withdrawal = Decimal('0')
            deposit = Decimal('0')
            balance = None

            if col_map.get('withdrawal'):
                val = row[col_map['withdrawal']]
                if pd.notna(val):
                    withdrawal = self._parse_amount(str(val)) or Decimal('0')

            if col_map.get('deposit'):
                val = row[col_map['deposit']]
                if pd.notna(val):
                    deposit = self._parse_amount(str(val)) or Decimal('0')

            if col_map.get('balance'):
                val = row[col_map['balance']]
                if pd.notna(val):
                    balance = self._parse_amount(str(val))

            description = ''
            if col_map.get('description'):
                val = row[col_map['description']]
                if pd.notna(val):
                    description = str(val)[:200]

            transactions.append({
                'date': txn_date,
                'description': description,
                'withdrawal': withdrawal,
                'deposit': deposit,
                'balance': balance
            })

        # Calculate totals
        total_withdrawals = sum(t['withdrawal'] for t in transactions)
        total_deposits = sum(t['deposit'] for t in transactions)
        closing_balance = transactions[-1]['balance'] if transactions and transactions[-1]['balance'] else None

        return {
            'success': True,
            'account_name': 'Excel Import',
            'account_number': None,
            'opening_balance': None,
            'closing_balance': closing_balance,
            'statement_period': {
                'from': transactions[0]['date'] if transactions else None,
                'to': transactions[-1]['date'] if transactions else None
            },
            'transactions': transactions,
            'summary': {
                'total_withdrawals': total_withdrawals,
                'total_deposits': total_deposits,
                'transaction_count': len(transactions)
            }
        }

    def _detect_columns(self, df) -> Dict[str, str]:
        """Auto-detect column mappings in DataFrame."""
        col_map = {}
        columns_lower = {col: col.lower() for col in df.columns}

        # Date column detection
        date_patterns = ['date', 'txn date', 'transaction date', 'value date']
        for col, col_lower in columns_lower.items():
            for pattern in date_patterns:
                if pattern in col_lower:
                    col_map['date'] = col
                    break
            if 'date' in col_map:
                break

        # Description column
        desc_patterns = ['description', 'narration', 'particulars', 'details', 'remarks']
        for col, col_lower in columns_lower.items():
            for pattern in desc_patterns:
                if pattern in col_lower:
                    col_map['description'] = col
                    break

        # Withdrawal/Debit column
        withdrawal_patterns = ['withdrawal', 'debit', 'dr', 'debit amount']
        for col, col_lower in columns_lower.items():
            for pattern in withdrawal_patterns:
                if pattern in col_lower:
                    col_map['withdrawal'] = col
                    break

        # Deposit/Credit column
        deposit_patterns = ['deposit', 'credit', 'cr', 'credit amount']
        for col, col_lower in columns_lower.items():
            for pattern in deposit_patterns:
                if pattern in col_lower:
                    col_map['deposit'] = col
                    break

        # Balance column
        balance_patterns = ['balance', 'running balance', 'closing balance']
        for col, col_lower in columns_lower.items():
            for pattern in balance_patterns:
                if pattern in col_lower:
                    col_map['balance'] = col
                    break

        return col_map

    def _parse_image(self, file) -> Dict[str, Any]:
        """
        Parse image bank statement using OCR.
        Requires pytesseract and tesseract-ocr to be installed.
        """
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            raise ImportError(
                "pytesseract and Pillow are required for image parsing. "
                "Install with: pip install pytesseract Pillow\n"
                "Also install Tesseract OCR: https://github.com/tesseract-ocr/tesseract"
            )

        # Open image
        if hasattr(file, 'read'):
            image = Image.open(file)
        else:
            image = Image.open(file)

        # Extract text using OCR
        text = pytesseract.image_to_string(image)

        # Parse extracted text (similar to PDF text parsing)
        account_name, account_number = self._extract_account_info(text)
        opening_balance = self._extract_opening_balance(text)
        closing_balance = self._extract_closing_balance(text)
        statement_from, statement_to = self._extract_statement_period(text)

        # For images, we can't easily extract tables
        # Return basic info and let user manually verify
        return {
            'success': True,
            'account_name': account_name,
            'account_number': account_number,
            'opening_balance': opening_balance,
            'closing_balance': closing_balance,
            'statement_period': {
                'from': statement_from,
                'to': statement_to
            },
            'transactions': [],  # Manual entry needed for images
            'summary': {
                'total_withdrawals': Decimal('0'),
                'total_deposits': Decimal('0'),
                'transaction_count': 0
            },
            'raw_text': text,  # Include raw text for debugging
            'note': 'Image OCR completed. Transactions may need manual verification.'
        }

    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse date string to date object."""
        if not date_str or not isinstance(date_str, str):
            return None

        date_str = date_str.strip()

        # Common date formats
        formats = [
            '%d/%m/%Y',      # 31/12/2025
            '%d-%m-%Y',      # 31-12-2025
            '%Y-%m-%d',      # 2025-12-31
            '%d-%b-%Y',      # 31-Dec-2025
            '%d/%b/%Y',      # 31/Dec/2025
            '%d %b %Y',      # 31 Dec 2025
            '%d-%B-%Y',      # 31-December-2025
            '%m/%d/%Y',      # 12/31/2025 (US format)
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    def _parse_amount(self, amount_str: str) -> Optional[Decimal]:
        """Parse amount string to Decimal."""
        if not amount_str or not isinstance(amount_str, str):
            return None

        # Clean the string
        amount_str = amount_str.strip()

        # Remove currency symbols and spaces
        amount_str = re.sub(r'[PKR\s₨Rs\.]+', '', amount_str, flags=re.IGNORECASE)

        # Remove commas
        amount_str = amount_str.replace(',', '')

        # Handle empty or invalid strings
        if not amount_str or amount_str in ['-', '--', 'N/A', 'n/a']:
            return None

        try:
            return Decimal(amount_str)
        except InvalidOperation:
            return None


# Convenience function for direct use
def parse_bank_statement(file, file_type: str) -> Dict[str, Any]:
    """
    Parse a bank statement file.

    Args:
        file: File object or path
        file_type: Extension (pdf, xlsx, csv, png, jpg)

    Returns:
        Parsed statement data
    """
    parser = BankStatementParser()
    return parser.parse_file(file, file_type)
