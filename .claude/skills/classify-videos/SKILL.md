---
name: classify-videos
description: Classify the TikTok videos in 02_Data_Cleansing/source_links.csv as "food recipe", "restaurant" or "other", add searchable sub-categories (cuisine, meal type, location, venue, dietary), and write a CSV containing only the food recipe and restaurant rows. Use when the user asks to classify, categorise, tag or filter the TikTok video catalogue, or invokes /classify-videos.
---

# Classify TikTok videos

Takes the output of `02_Data_Cleansing/source_links.py` and produces
`02_Data_Cleansing/classified_videos.csv`: every column of `source_links.csv`
plus the classification columns below, **only for rows that are a food recipe or
a restaurant**. "other" rows are dropped from the output.

Paths are relative to the project root (`C:\my-apps\tiktok-finds`). Run all
Python with `python -I`.

## Workflow

1. **Check the input.** `02_Data_Cleansing/source_links.csv` must exist (run
   `source_links.py` first if not). Report its row count.
2. **Prepare batches.**
   `python -I .claude/skills/classify-videos/prepare_batches.py [BATCH_SIZE] [LIMIT]`
   splits the input into `02_Data_Cleansing/classification_work/batch_NNN.csv`
   (default 75 rows each; `LIMIT` = only the first N rows, for testing). Batches
   that already have a `labels_NNN.jsonl` are skipped, so interrupted runs resume.
3. **Classify with sub-agents.** For each batch that has no labels file, launch
   one sub-agent (general-purpose, `model: "sonnet"`), up to 5 in parallel.
   Give each agent: the rules below (verbatim), its batch file path, and the
   output path `classification_work/labels_NNN.jsonl`. Each agent must read every
   row and judge it itself (no keyword matching), judging from caption and
   hashtags only (never fetch URLs), and write one JSON object per line.
4. **Merge.**
   `python -I .claude/skills/classify-videos/merge_labels.py`
   validates the labels (allowed values, every video_id labelled exactly once),
   joins them to the source rows and writes `classified_videos.csv`. If it
   reports missing or invalid labels, re-run the affected batches (delete their
   `labels_NNN.jsonl` and repeat step 3) before finishing.
5. **Load into Supabase.** `classified_videos.csv` is now a local, git-ignored
   intermediate; the app reads from Supabase. From `02_Data_Cleansing`, with
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the untracked `.env`:
   `python -I load_to_supabase.py` (upserts by video_id, so re-running is safe).
   For new rows, run `python -I download_thumbnails.py` and then
   `python -I upload_thumbnails.py`, which must end with `OK`; afterwards the
   local `03_App/public/thumbs/` folder can be deleted again. Thumbnail URLs for
   rows loaded earlier have expired, so ignore their download failures.
6. **Report** the counts per category, the number of low-confidence rows, and
   the top cuisines. Mention the file path. Do not paste the whole CSV.

## Classification rules (give these to every sub-agent)

**category** (exactly one):
- `food recipe`: teaches or shows how to make a dish or food at home, including
  cooking techniques, meal-prep ideas and food hacks.
- `restaurant`: features a specific restaurant, cafe, street-food stall, food
  market vendor, bakery shop or other eating venue to visit, or a roundup of such
  places.
- `other`: everything else. This includes, explicitly:
  - cocktails and other drink recipes
  - bakery "Too Good To Go" bags and similar surprise-bag deals
  - grocery finds, supermarket product reviews, shopping hauls
  - bars/pubs featured only for drinks
  - humour, memes, pets, music, news, fashion, fitness, and anything not food
  - videos whose caption gives nothing to judge

When it is a close call, choose the best-fitting category but set
`confidence` to `low`. Pure food-meme or food-opinion content with no recipe or
venue is `other`.

**Sub-categories** (fill for `food recipe` and `restaurant`; leave `""` for
`other`; use only what the caption/hashtags support, never guess):
- `cuisine`: one primary cuisine, title case, from a consistent vocabulary:
  Italian, Japanese, Korean, Chinese, Thai, Vietnamese, Indian, Pakistani,
  Bangladeshi, Middle Eastern, Lebanese, Turkish, Greek, Mediterranean, Mexican,
  American, British, French, Spanish, African, Caribbean, Fusion, Other,
  or `""` if unclear. Prefer these over inventing new labels.
- `meal_type`: one of breakfast, lunch, dinner, snack, dessert, drink, side,
  baking, or `""`.
- `dish`: short main dish/ingredient, lower case (e.g. "chicken fajita wrap").
- `location`: for restaurants, the city/area as stated (e.g. "Tooting, London");
  `""` if not stated. Always `""` for recipes.
- `venue_name`: for restaurants, the venue name as stated; else `""`.
- `dietary`: semicolon-separated from vegetarian; vegan; gluten-free;
  dairy-free; high-protein; low-calorie; or `""`.
- `confidence`: `high`, `medium` or `low`.
- `reason`: at most 12 words explaining the category.

**Output format**: one JSON object per line, keys exactly
`video_id, category, cuisine, meal_type, dish, location, venue_name, dietary,
confidence, reason`. `video_id` must be copied as a string. Label every row in
the batch, in order.

## Output columns

`classified_videos.csv` (UTF-8 with BOM): `video_id, canonical_url, posted_at,
caption, hashtags, thumbnail_url, category, cuisine, meal_type, dish, location,
venue_name, dietary, confidence, reason`.
