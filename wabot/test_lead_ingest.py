"""
Test script for POST /api/crm/leads/whatsapp/
Verifies authentication, field mapping, and all 3 lead types.

Usage:
    python wabot/test_lead_ingest.py
    python wabot/test_lead_ingest.py --url http://localhost:8000
"""

import argparse
import json
import sys
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_URL = "https://koderkids-erp.onrender.com"
BOT_KEY     = "363d09454dd9db87525b4ddbbf80aed04993f7b141518b10abb54675a4ce6f6b"
ENDPOINT    = "/api/crm/leads/whatsapp/"

# ── Helpers ───────────────────────────────────────────────────────────────────
def post(base_url: str, payload: dict, bot_key: str | None) -> tuple[int, dict | str]:
    url  = base_url.rstrip("/") + ENDPOINT
    body = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if bot_key is not None:
        headers["X-Bot-Key"] = bot_key
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw

def ok(status: int) -> str:
    return "✓" if status in (200, 201) else "✗"

def run_test(label: str, base_url: str, payload: dict, bot_key: str | None,
             expect_status: int) -> bool:
    status, body = post(base_url, payload, bot_key)
    passed = status == expect_status
    mark   = "PASS" if passed else "FAIL"
    print(f"  [{mark}] {label}")
    print(f"         status  : {status}  (expected {expect_status})")
    if isinstance(body, dict):
        print(f"         response: {json.dumps(body, ensure_ascii=False)}")
    else:
        print(f"         response: {body[:300]}")
    print()
    return passed

# ── Test cases ────────────────────────────────────────────────────────────────
PARENT_LEAD = {
    "type"          : "parent",
    "name"          : "Test Parent",
    "phone"         : "923001112233",
    "whatsapp_from" : "923001112233@c.us",
    "city"          : "Lahore",
    "child_age"     : "9-13",
    "has_laptop"    : "Yes",
    "interest"      : "Free Demo Class",
    "notes"         : "Test lead from test_lead_ingest.py",
}

SCHOOL_LEAD = {
    "type"               : "school",
    "name"               : "Ms. Ayesha Khan",
    "phone"              : "923001112244",
    "whatsapp_from"      : "923001112244@c.us",
    "school_name"        : "Test School",
    "city"               : "Islamabad",
    "role_at_school"     : "Principal",
    "lab"                : "No",
    "estimated_students" : 350,
    "interest"           : "Education AI",
    "notes"              : "Test lead from test_lead_ingest.py",
}

OTHER_LEAD = {
    "type"          : "other",
    "name"          : "Ali Raza",
    "phone"         : "923001112255",
    "whatsapp_from" : "923001112255@c.us",
    "city"          : "Karachi",
    "interest"      : "General inquiry",
    "notes"         : "Test lead from test_lead_ingest.py",
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL, help="Backend base URL")
    args = parser.parse_args()
    base = args.url.rstrip("/")

    print(f"\n{'='*60}")
    print(f"  WhatsApp Lead Ingest — API Test")
    print(f"  Target: {base}{ENDPOINT}")
    print(f"{'='*60}\n")

    results = []

    # 1. Auth: wrong / missing key → 401
    # DRF returns 401 (not 403) when the permission check fails on an
    # unauthenticated request (no Bearer token).  WhatsAppBotKeyPermission
    # returns False → DRF raises NotAuthenticated → HTTP 401.
    print("── Authentication ──────────────────────────────────────────")
    results.append(run_test(
        "Wrong X-Bot-Key → 401",
        base, PARENT_LEAD, "wrong_key_here", 401
    ))
    results.append(run_test(
        "Missing X-Bot-Key → 401",
        base, PARENT_LEAD, None, 401
    ))

    # 2. Lead types
    print("── Lead Types ──────────────────────────────────────────────")
    results.append(run_test(
        "Parent lead (type=parent) → 201",
        base, PARENT_LEAD, BOT_KEY, 201
    ))
    results.append(run_test(
        "School lead (type=school) → 201",
        base, SCHOOL_LEAD, BOT_KEY, 201
    ))
    results.append(run_test(
        "Other lead  (type=other)  → 201",
        base, OTHER_LEAD, BOT_KEY, 201
    ))

    # 3. Validation edge cases
    print("── Validation ──────────────────────────────────────────────")
    results.append(run_test(
        "Invalid type → 400",
        base,
        {**PARENT_LEAD, "type": "invalid_type"},
        BOT_KEY, 400
    ))
    results.append(run_test(
        "School lead: no school_name + no phone → 400",
        base,
        {"type": "school", "name": "Anon"},
        BOT_KEY, 400
    ))
    results.append(run_test(
        "Parent: no phone but name present → 201 (school_name auto-gen)",
        base,
        {"type": "parent", "name": "Jane Doe", "city": "Lahore"},
        BOT_KEY, 201
    ))

    # 4. Summary
    passed = sum(results)
    total  = len(results)
    print(f"{'='*60}")
    print(f"  Result: {passed}/{total} tests passed")
    print(f"{'='*60}\n")
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()
