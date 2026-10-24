"""Upsert classified_videos.csv into the Supabase `videos` table.

Safe to re-run (upserts by video_id). thumb_path is left alone here; upload_thumbnails.py
sets it. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. Run: python -I load_to_supabase.py
"""
import csv
from pathlib import Path

import requests

from supabase_env import load_env

CSV_PATH = Path(__file__).resolve().parent / "classified_videos.csv"
BATCH = 100


def split(value):
    return [p.strip() for p in (value or "").split(";") if p.strip()]


def to_record(row):
    return {
        "video_id": row["video_id"],
        "canonical_url": row["canonical_url"],
        "posted_at": row["posted_at"] or None,
        "caption": row["caption"] or None,
        "hashtags": row["hashtags"] or None,
        "category": row["category"],
        "cuisine": row["cuisine"] or None,
        "meal_type": row["meal_type"] or None,
        "dish": row["dish"] or None,
        "location": row["location"] or None,
        "venue_names": split(row["venue_name"]),
        "dietary": split(row["dietary"]),
        "confidence": row["confidence"] or None,
        "reason": row["reason"] or None,
        "source": "pipeline",
    }


def main():
    url, auth = load_env()
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        records = [to_record(r) for r in csv.DictReader(f)]
    for i in range(0, len(records), BATCH):
        r = requests.post(
            f"{url}/rest/v1/videos?on_conflict=video_id",
            headers={**auth, "Content-Type": "application/json",
                     "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=records[i:i + BATCH], timeout=60)
        r.raise_for_status()
    r = requests.get(f"{url}/rest/v1/videos?select=video_id", headers={**auth, "Prefer": "count=exact", "Range": "0-0"}, timeout=30)
    print(f"Upserted {len(records)} rows; table now holds {r.headers['Content-Range'].split('/')[-1]}.")


if __name__ == "__main__":
    main()
