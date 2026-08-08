#!/usr/bin/env python
import os
import sys
from dotenv import load_dotenv

# Windows' console defaults to the legacy cp1252 codepage, which can't encode
# the emoji used throughout this codebase's print()/logging debug output —
# any of those statements crashes the request with UnicodeEncodeError when
# running `manage.py runserver` locally on Windows. Production (Docker/Linux)
# already defaults to UTF-8, so this only matters for local dev.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Force protobuf pure-Python implementation before any imports.
# The C extension (google._upb._message) is incompatible with Python 3.14
# and raises TypeError: Metaclasses with custom tp_new are not supported.
os.environ.setdefault('PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION', 'python')

# Load .env manually before Django starts
load_dotenv()

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
