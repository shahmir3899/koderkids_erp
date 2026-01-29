"""
PDF Text Extractor Script with OCR Support
Extracts text from scanned PDF files using Tesseract OCR.
"""

import os
from datetime import datetime

# Try importing OCR libraries
try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False


def extract_with_ocr(pdf_path, output_path, pages=None, lang='eng'):
    """
    Extract text from scanned PDF using OCR.
    """
    print("Using OCR mode (for scanned PDFs)...")
    print("Converting PDF pages to images...")

    # Convert PDF to images
    # You may need to specify poppler_path on Windows
    try:
        images = convert_from_path(pdf_path, dpi=300)
    except Exception as e:
        if "poppler" in str(e).lower():
            print("\nERROR: Poppler not found!")
            print("Download from: https://github.com/osber/poppler-windows/releases")
            print("Extract and add 'bin' folder to PATH, or specify poppler_path in code")
            return None
        raise e

    total_pages = len(images)
    page_nums = list(pages) if pages else list(range(total_pages))

    with open(output_path, 'w', encoding='utf-8') as f:
        # Write header
        f.write("=" * 60 + "\n")
        f.write(f"PDF Text Extraction Report (OCR)\n")
        f.write(f"Source: {pdf_path}\n")
        f.write(f"Total Pages in PDF: {total_pages}\n")
        f.write(f"Pages Extracted: {len(page_nums)}\n")
        f.write(f"OCR Language: {lang}\n")
        f.write(f"Extracted on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 60 + "\n\n")

        for page_num in page_nums:
            if 0 <= page_num < total_pages:
                print(f"Processing page {page_num + 1}/{total_pages}...", end=" ")

                # OCR the image
                text = pytesseract.image_to_string(images[page_num], lang=lang)

                # Write to file
                f.write(f"\n{'='*20} PAGE {page_num + 1} {'='*20}\n\n")
                f.write(text)
                f.write("\n")

                print(f"✓ {len(text)} characters extracted")
            else:
                print(f"✗ Page {page_num + 1} - Invalid page number (skipped)")

    print(f"\n✓ Output saved to: {output_path}")
    return output_path


def extract_with_fitz(pdf_path, output_path, pages=None):
    """
    Extract text from PDF with selectable text (non-scanned).
    """
    print("Using standard mode (for PDFs with selectable text)...")

    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    page_nums = list(pages) if pages else list(range(total_pages))

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("=" * 60 + "\n")
        f.write(f"PDF Text Extraction Report\n")
        f.write(f"Source: {pdf_path}\n")
        f.write(f"Total Pages in PDF: {total_pages}\n")
        f.write(f"Pages Extracted: {len(page_nums)}\n")
        f.write(f"Extracted on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 60 + "\n\n")

        for page_num in page_nums:
            if 0 <= page_num < total_pages:
                page = doc[page_num]
                text = page.get_text()

                f.write(f"\n{'='*20} PAGE {page_num + 1} {'='*20}\n\n")
                f.write(text)
                f.write("\n")

                print(f"✓ Page {page_num + 1}/{total_pages} - {len(text)} characters extracted")

    doc.close()
    print(f"\n✓ Output saved to: {output_path}")
    return output_path


if __name__ == "__main__":
    # ===========================================
    # CONFIGURATION
    # ===========================================

    # Your PDF file path
    PDF_FILE = r"C:\Users\hp\Downloads\Kids Book Class 1(ver2).pdf.pdf"

    # Output file path
    OUTPUT_FILE = r"C:\Users\hp\Downloads\Kids_Book_Class_1_extracted.txt"

    # Pages to extract (set to None for ALL pages)
    # Examples: None (all), [0] (first), [0,1,2] (first 3), range(0,20) (first 20)
    PAGES = range(0, 20)

    # OCR Settings
    USE_OCR = True  # Set to True for scanned PDFs
    OCR_LANGUAGE = 'eng'  # 'eng' for English, 'hin' for Hindi, 'eng+hin' for both

    # Windows: Set Tesseract path if not in PATH
    # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

    # ===========================================
    # RUN EXTRACTION
    # ===========================================

    print("PDF Text Extractor")
    print("-" * 40)

    if not os.path.exists(PDF_FILE):
        print(f"ERROR: PDF not found: {PDF_FILE}")
        exit(1)

    try:
        if USE_OCR:
            if not OCR_AVAILABLE:
                print("ERROR: OCR libraries not installed!")
                print("Run: pip install pdf2image pytesseract")
                exit(1)
            extract_with_ocr(PDF_FILE, OUTPUT_FILE, PAGES, OCR_LANGUAGE)
        else:
            if not FITZ_AVAILABLE:
                print("ERROR: PyMuPDF not installed!")
                print("Run: pip install pymupdf")
                exit(1)
            extract_with_fitz(PDF_FILE, OUTPUT_FILE, PAGES)

        print("\n" + "=" * 40)
        print("EXTRACTION COMPLETE!")

    except Exception as e:
        print(f"\nERROR: {e}")