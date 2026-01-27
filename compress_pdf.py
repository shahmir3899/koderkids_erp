"""
Script to compress PDF using pikepdf
"""
import subprocess
import sys
import os

# Install pikepdf if not available
try:
    import pikepdf
except ImportError:
    print("Installing pikepdf...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pikepdf"])
    import pikepdf

def compress_pdf(input_path, output_path):
    """Compress PDF file using pikepdf"""
    print(f"Reading: {input_path}")

    # Get original size
    original_size = os.path.getsize(input_path)
    print(f"Original size: {original_size / (1024*1024):.2f} MB")

    # Open and compress
    with pikepdf.open(input_path) as pdf:
        # Remove metadata
        with pdf.open_metadata() as meta:
            # Clear all metadata
            pass

        # Save with compression
        pdf.save(output_path,
                 linearize=True,  # Optimize for web viewing
                 compress_streams=True,  # Compress content streams
                 stream_decode_level=pikepdf.StreamDecodeLevel.specialized,
                 object_stream_mode=pikepdf.ObjectStreamMode.generate,
                 recompress_flate=True)  # Recompress with better settings

    # Get new size
    new_size = os.path.getsize(output_path)
    print(f"Compressed size: {new_size / (1024*1024):.2f} MB")
    print(f"Reduction: {((original_size - new_size) / original_size) * 100:.1f}%")
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    input_file = r"d:\Personal\school-management-system\Kids Book 2 Ver-3.1.pdf.pdf"
    output_file = r"d:\Personal\school-management-system\Kids_Book_2_compressed.pdf"

    compress_pdf(input_file, output_file)
