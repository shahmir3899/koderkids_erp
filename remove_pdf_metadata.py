"""
Script to remove metadata from a PDF file
"""
import subprocess
import sys

# Install PyPDF2 if not available
try:
    from PyPDF2 import PdfReader, PdfWriter
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    from PyPDF2 import PdfReader, PdfWriter

def remove_metadata(input_path, output_path):
    """Remove metadata from PDF file"""
    print(f"Reading: {input_path}")

    reader = PdfReader(input_path)
    writer = PdfWriter()

    # Copy all pages
    for page in reader.pages:
        writer.add_page(page)

    # Clear metadata
    writer.add_metadata({})

    # Write output
    with open(output_path, "wb") as f:
        writer.write(f)

    print(f"Saved to: {output_path}")
    print("Metadata removed successfully!")

if __name__ == "__main__":
    input_file = r"d:\Personal\school-management-system\Kids Book 2 Ver-3.1.pdf.pdf"
    output_file = r"d:\Personal\school-management-system\Kids_Book_2_clean.pdf"

    remove_metadata(input_file, output_file)
