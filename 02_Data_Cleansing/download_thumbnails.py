"""Download the thumbnail of every row in classified_videos.csv.

TikTok thumbnail URLs are signed and expire, so run this soon after refreshing the CSV.
Images are saved as <OUT>/<video_id>.jpg; files that already exist are skipped, so an
interrupted run resumes. Images are shrunk to 360px wide. Run: python -I download_thumbnails.py
"""
import csv
import io
import time
import urllib.request
from pathlib import Path

from PIL import Image  # pip install pillow

HERE = Path(__file__).resolve().parent
CSV_PATH = HERE / "classified_videos.csv"
OUT = HERE.parent / "03_App" / "public" / "thumbs"
DELAY = 0.4  # seconds between requests; be polite to the CDN
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
MAX_WIDTH = 360  # cards are ~171 CSS px wide; 2x is plenty and keeps each file around 20 KB


def shrink(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    if img.width > MAX_WIDTH:
        img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, "JPEG", quality=78, optimize=True)
    return out.getvalue()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    ok = skipped = failed = 0
    for i, row in enumerate(rows, 1):
        dest = OUT / f"{row['video_id']}.jpg"
        if dest.exists() and dest.stat().st_size > 0:
            if dest.stat().st_size > 60_000:  # still the full-size original: shrink in place
                dest.write_bytes(shrink(dest.read_bytes()))
            skipped += 1
            continue
        url = row.get("thumbnail_url", "")
        if not url:
            failed += 1
            continue
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                data = urllib.request.urlopen(req, timeout=30).read()
                dest.write_bytes(shrink(data))
                ok += 1
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 2:
                    failed += 1
                    print(f"FAILED {row['video_id']}: {e}")
                else:
                    time.sleep(2 * (attempt + 1))
        time.sleep(DELAY)
        if i % 50 == 0:
            print(f"{i}/{len(rows)} ok={ok} skipped={skipped} failed={failed}", flush=True)
    print(f"done: ok={ok} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
