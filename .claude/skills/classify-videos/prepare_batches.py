"""Split source_links.csv into batch files for classification.

Usage: python -I prepare_batches.py [BATCH_SIZE] [LIMIT]
Writes 02_Data_Cleansing/classification_work/batch_NNN.csv (video_id, caption, hashtags).
Batches that already have labels_NNN.jsonl are left alone.
"""
import csv, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "02_Data_Cleansing" / "source_links.csv"
WORK = ROOT / "02_Data_Cleansing" / "classification_work"
SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 75
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else None

rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
if LIMIT:
    rows = rows[:LIMIT]
WORK.mkdir(exist_ok=True)
todo = []
for n, i in enumerate(range(0, len(rows), SIZE), 1):
    chunk = rows[i:i + SIZE]
    path = WORK / f"batch_{n:03d}.csv"
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["video_id", "caption", "hashtags"])
        w.writerows([r["video_id"], r["caption"], r["hashtags"]] for r in chunk)
    if not (WORK / f"labels_{n:03d}.jsonl").exists():
        todo.append(path.name)
print(f"{len(rows)} rows -> {n} batches; {len(todo)} still need labels:")
for t in todo:
    print(" ", t)
