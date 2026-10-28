"""
OCR for scanned or photographed bank statements.

Many statements arrive as PDFs made from phone photos (CamScanner and similar),
so they contain pictures only, with no text layer. This module renders each page
to an image and reads it with RapidOCR (a pip-installable ONNX model, so no
system packages such as the Tesseract binary are needed on the server).

The result is positioned words, the same shape the statement parser already
understands, so scanned and digital statements go through one code path.
"""

import io
import logging
import math
import statistics
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_ENGINE = None
RENDER_SCALE = 3          # PDF points -> pixels (3 is roughly 216 dpi)
MAX_SIDE = 4000           # cap the longest image side, in pixels
MAX_PAGES = 30


class OCRUnavailable(RuntimeError):
    """The OCR library is not installed."""


def _engine():
    global _ENGINE
    if _ENGINE is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
        except ImportError as e:  # pragma: no cover
            raise OCRUnavailable(
                'Reading scanned statements needs the rapidocr-onnxruntime package. '
                'Install it with: pip install rapidocr-onnxruntime'
            ) from e
        _ENGINE = RapidOCR()
    return _ENGINE


def _words_from_result(result: List[Any]) -> List[Dict[str, Any]]:
    """OCR boxes -> [{'text','x0','x1','top','height'}] with page skew corrected."""
    boxes = []
    for box, text, _score in result or []:
        text = (text or '').strip()
        if not text:
            continue
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        boxes.append({'text': text, 'box': box, 'x0': min(xs), 'x1': max(xs),
                      'cy': sum(ys) / 4.0, 'h': max(ys) - min(ys)})
    if not boxes:
        return []

    # Photographed pages are rarely level: estimate the tilt from the top edges of wide boxes.
    angles = []
    for b in boxes:
        (x1, y1), (x2, y2) = b['box'][0], b['box'][1]
        if x2 - x1 > 3 * b['h']:
            angles.append(math.atan2(y2 - y1, x2 - x1))
    tilt = statistics.median(angles) if angles else 0.0
    if abs(tilt) < math.radians(0.3):
        tilt = 0.0
    cos, sin = math.cos(tilt), math.sin(tilt)

    words = []
    for b in boxes:
        cx = (b['x0'] + b['x1']) / 2.0
        half = (b['x1'] - b['x0']) / 2.0
        rx = cx * cos + b['cy'] * sin          # rotate the centre by -tilt
        ry = -cx * sin + b['cy'] * cos
        words.append({'text': b['text'], 'x0': rx - half, 'x1': rx + half, 'top': ry, 'height': b['h']})
    return words


def ocr_image_words(image) -> List[Dict[str, Any]]:
    """Positioned words from a PIL image."""
    import numpy as np

    image = image.convert('RGB')
    longest = max(image.size)
    if longest > MAX_SIDE:
        ratio = MAX_SIDE / float(longest)
        image = image.resize((int(image.width * ratio), int(image.height * ratio)))
    result, _elapsed = _engine()(np.array(image))
    return _words_from_result(result)


def ocr_pdf_pages(pdf_bytes: bytes) -> List[List[Dict[str, Any]]]:
    """Render every page of a PDF and OCR it. Returns one word list per page."""
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(io.BytesIO(pdf_bytes))
    pages = []
    try:
        for index in range(min(len(pdf), MAX_PAGES)):
            page = pdf[index]
            image = page.render(scale=RENDER_SCALE).to_pil()
            pages.append(ocr_image_words(image))
            page.close()
    finally:
        pdf.close()
    return pages


def line_settings(words: List[Dict[str, Any]]) -> Dict[str, float]:
    """Line tolerance and cell gap scaled to the text height of this scan."""
    heights = [w['height'] for w in words if w.get('height')]
    h = statistics.median(heights) if heights else 20.0
    return {'line_tol': h * 0.6, 'gap': h * 1.2}
