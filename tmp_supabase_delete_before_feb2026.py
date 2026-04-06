from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import requests
from supabase import create_client


env_path = Path('frontend/.env')
if not env_path.exists():
    raise FileNotFoundError('frontend/.env not found')

env = {}
for raw in env_path.read_text(encoding='utf-8').splitlines():
    line = raw.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k, v = line.split('=', 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('REACT_APP_SUPABASE_URL')
key = env.get('REACT_APP_SUPABASE_SEC_KEY')
if not url or not key:
    raise RuntimeError('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_SEC_KEY in frontend/.env')

supabase = create_client(url, key)

# Keep Feb/Mar/Apr 2026. Delete older images only.
keep_start = datetime(2026, 2, 1, 0, 0, 0, tzinfo=timezone.utc)

image_exts = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif', 'avif'}


def is_image(name: str, mime: str | None) -> bool:
    ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
    return ext in image_exts or (mime or '').lower().startswith('image/')


def parse_dt(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)
    except Exception:
        return None


headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
}
storage_base = url.rstrip('/') + '/storage/v1'

resp = requests.get(storage_base + '/bucket', headers=headers, timeout=60)
resp.raise_for_status()
buckets = resp.json()
if isinstance(buckets, dict):
    buckets = [buckets]

candidates_by_bucket = {}
scanned_files = 0
candidates_found = 0

for b in buckets:
    bucket = b['id']
    queue = ['']
    seen = set()
    candidates_by_bucket[bucket] = []

    while queue:
        prefix = queue.pop(0)
        if prefix in seen:
            continue
        seen.add(prefix)

        offset = 0
        limit = 1000
        while True:
            payload = {
                'prefix': prefix,
                'limit': limit,
                'offset': offset,
                'sortBy': {'column': 'name', 'order': 'asc'},
            }
            lr = requests.post(f'{storage_base}/object/list/{bucket}', headers=headers, json=payload, timeout=120)
            lr.raise_for_status()
            rows = lr.json() or []
            if not isinstance(rows, list):
                rows = [rows]
            if not rows:
                break

            for r in rows:
                if r.get('id') is None:
                    child = (prefix + r.get('name', '') + '/').lstrip('/')
                    if child and child not in seen:
                        queue.append(child)
                    continue

                name = r.get('name', '')
                full_name = (prefix + name) if prefix else name
                meta = r.get('metadata') or {}
                mime = meta.get('mimetype')
                created_at = parse_dt(r.get('created_at'))
                scanned_files += 1

                if not is_image(full_name, mime):
                    continue
                if created_at is None:
                    continue
                if created_at < keep_start:
                    candidates_by_bucket[bucket].append(full_name)
                    candidates_found += 1

            if len(rows) < limit:
                break
            offset += limit

chunk_size = 100
deleted_total = 0
failed_total = 0
bucket_results = []

for bucket, paths in candidates_by_bucket.items():
    if not paths:
        continue

    deleted_bucket = 0
    failed_bucket = 0

    for i in range(0, len(paths), chunk_size):
        chunk = paths[i:i + chunk_size]
        try:
            supabase.storage.from_(bucket).remove(chunk)
            deleted_bucket += len(chunk)
        except Exception:
            failed_bucket += len(chunk)

    deleted_total += deleted_bucket
    failed_total += failed_bucket
    bucket_results.append((bucket, len(paths), deleted_bucket, failed_bucket))

print('DELETE_RUN=TRUE')
print('RULE=Keep Feb/Mar/Apr 2026; delete image files before 2026-02-01')
print(f'SCANNED_FILES={scanned_files}')
print(f'CANDIDATES_FOUND={candidates_found}')
print(f'DELETED_TOTAL={deleted_total}')
print(f'FAILED_TOTAL={failed_total}')
print('BUCKET_RESULTS_START')
for bucket, found, deleted, failed in sorted(bucket_results):
    print(f'{bucket},found={found},deleted={deleted},failed={failed}')
print('BUCKET_RESULTS_END')
