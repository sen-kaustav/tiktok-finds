"""Validate labels_NNN.jsonl files, join them to source_links.csv and write
classified_videos.csv containing only 'food recipe' and 'restaurant' rows.

Usage: python -I merge_labels.py
"""
import collections, csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "02_Data_Cleansing"
SRC = DIR / "source_links.csv"
WORK = DIR / "classification_work"
OUT = DIR / "classified_videos.csv"

CATEGORIES = {"food recipe", "restaurant", "other"}
CONFIDENCE = {"high", "medium", "low"}
MEAL = {"breakfast", "lunch", "dinner", "snack", "dessert", "drink", "side", "baking", ""}
LABEL_COLS = ["category", "cuisine", "meal_type", "dish", "location", "venue_name",
              "dietary", "confidence", "reason"]

src_rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
batch_ids = set()
for b in WORK.glob("batch_*.csv"):
    batch_ids |= {r["video_id"] for r in csv.DictReader(open(b, encoding="utf-8-sig"))}

labels, problems = {}, []
for p in sorted(WORK.glob("labels_*.jsonl")):
    for ln, line in enumerate(open(p, encoding="utf-8"), 1):
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            problems.append(f"{p.name}:{ln} not valid JSON")
            continue
        vid = str(rec.get("video_id", ""))
        if vid in labels:
            problems.append(f"{p.name}:{ln} duplicate {vid}")
        elif vid not in batch_ids:
            problems.append(f"{p.name}:{ln} unknown video_id {vid}")
        elif rec.get("category") not in CATEGORIES:
            problems.append(f"{p.name}:{ln} bad category {rec.get('category')!r}")
        elif rec.get("confidence") not in CONFIDENCE:
            problems.append(f"{p.name}:{ln} bad confidence {rec.get('confidence')!r}")
        elif rec.get("meal_type", "") not in MEAL:
            problems.append(f"{p.name}:{ln} bad meal_type {rec.get('meal_type')!r}")
        else:
            labels[vid] = rec

missing = sorted(batch_ids - set(labels))
if problems or missing:
    for pr in problems[:30]:
        print("PROBLEM:", pr)
    print(f"{len(problems)} invalid lines; {len(missing)} batched videos without a valid label")
    if missing:
        print("first missing:", missing[:5])
    print("Fix/re-run the affected batches, then run merge again. No output written.")
    sys.exit(1)

cols = list(src_rows[0].keys()) + LABEL_COLS
kept = []
counts = collections.Counter()
for r in src_rows:
    lab = labels.get(r["video_id"])
    if not lab:
        continue  # not part of the batched set (e.g. LIMIT run)
    counts[lab["category"]] += 1
    if lab["category"] in ("food recipe", "restaurant"):
        kept.append({**r, **{c: lab.get(c, "") for c in LABEL_COLS}})

with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(kept)

print(f"labelled {sum(counts.values())} videos: {dict(counts)}")
print(f"wrote {OUT.name}: {len(kept)} rows (food recipe + restaurant only)")
print("low confidence kept rows:", sum(1 for r in kept if r["confidence"] == "low"))
print("top cuisines:", collections.Counter(r["cuisine"] for r in kept if r["cuisine"]).most_common(8))
