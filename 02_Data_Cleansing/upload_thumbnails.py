"""Upload 03_App/public/thumbs/<video_id>.jpg to the private `thumbs` bucket and set thumb_path.

Run load_to_supabase.py first so the rows exist. Safe to re-run (uploads overwrite). Ends by
comparing the bucket's object count with the local folder; only delete the local folder when
it says OK. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. Run: python -I upload_thumbnails.py
"""
import sys
from pathlib import Path

import requests

from supabase_env import load_env

THUMBS = Path(__file__).resolve().parent.parent / "03_App" / "public" / "thumbs"
BUCKET = "thumbs"


def bucket_count(url, auth):
    names, offset = set(), 0
    while True:
        r = requests.post(f"{url}/storage/v1/object/list/{BUCKET}", headers=auth,
                          json={"prefix": "", "limit": 1000, "offset": offset}, timeout=60)
        r.raise_for_status()
        page = r.json()
        names.update(o["name"] for o in page)
        if len(page) < 1000:
            return names
        offset += 1000


def main():
    url, auth = load_env()
    files = sorted(THUMBS.glob("*.jpg"))
    failed = 0
    for i, path in enumerate(files, 1):
        name = path.name
        try:
            r = requests.post(f"{url}/storage/v1/object/{BUCKET}/{name}",
                              headers={**auth, "Content-Type": "image/jpeg", "x-upsert": "true"},
                              data=path.read_bytes(), timeout=60)
            r.raise_for_status()
            r = requests.patch(f"{url}/rest/v1/videos?video_id=eq.{path.stem}",
                               headers={**auth, "Content-Type": "application/json", "Prefer": "return=minimal"},
                               json={"thumb_path": name}, timeout=30)
            r.raise_for_status()
        except requests.RequestException as e:
            failed += 1
            print(f"FAILED {name}: {e}")
        if i % 100 == 0:
            print(f"{i}/{len(files)}")
    in_bucket = bucket_count(url, auth)
    missing = {p.name for p in files} - in_bucket
    ok = not failed and not missing
    print(f"Local {len(files)}, bucket {len(in_bucket)}, failed {failed}, missing {len(missing)}: {'OK' if ok else 'NOT OK'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
