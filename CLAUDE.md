# TikTok Finds

Goal: build a searchable catalogue (eventually a mobile PWA) of the TikTok videos
the user and a friend shared in a private chat since Jan 2025. Only two kinds are
kept: **food recipes** and **restaurants**, with sub-categories (cuisine, location,
etc.) for searching. Everything else is "other" and dropped. The app itself is not
designed yet; the current work is the data pipeline.

## Layout
- `01_Raw_Data/user_data_tiktok.json`: TikTok data export (one 1:1 chat, ~4,600 messages,
  ~2,240 unique video links of the form `tiktokv.com/share/video/<id>/`). Private; the
  links carry no metadata. Never commit or upload it.
- `02_Data_Cleansing/`: pipeline scripts and CSVs.
  - `source_links.py`: extracts links, fetches metadata, writes `source_links.csv`
    (video_id, canonical_url, posted_at, caption, hashtags, thumbnail_url). Unavailable
    videos are excluded and listed in `source_links_failed.csv`. Results are cached in
    `source_links_cache.jsonl`, so interrupted runs resume. Run: `python -I source_links.py [LIMIT]`.
  - `classified_videos.csv`: final output of the skill below (food recipe + restaurant rows only).
  - `download_thumbnails.py`: saves each row's thumbnail to `03_App/public/thumbs/<video_id>.jpg` (links expire, so run soon after refreshing the CSV). Run: `python -I download_thumbnails.py`.
- `03_App/`: the PWA (React + Vite, JavaScript). `npm run dev` copies the CSV into `public/data/` and serves it; see its README. `public/data/` and `public/thumbs/` are private and git-ignored. Design mock-up: the "TikTok Finds App Mockup" Artifact, built on the TikTok Finds design system.
- `.claude/skills/classify-videos/`: project skill (`/classify-videos`) that classifies
  `source_links.csv` using sub-agents, adds category and sub-category columns, and writes
  `classified_videos.csv`. Rules and taxonomy live in its `SKILL.md`.

## How metadata is fetched
`yt-dlp` fails on TikTok here. What works: rewrite the link to `tiktok.com/@/video/<id>`,
scrape the `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON from the page, and fall back to the
public oEmbed endpoint. Thumbnail URLs expire, so images should be downloaded before the
app depends on them.

## Decisions made
- Categories: `food recipe`, `restaurant`, `other`.
- Always `other`: cocktails and drink recipes, Too Good To Go / bakery bags, grocery finds
  and supermarket reviews, bars/pubs featured only for drinks.
- Final CSV keeps only food recipe and restaurant rows, with all source columns retained.

## Conventions
- Run Python with `python -I`. Write CSVs as UTF-8 with BOM (`utf-8-sig`) so Excel shows emoji.
- Be polite to TikTok: keep the delay between requests and the retry/backoff in `source_links.py`.
- Keep scratch files out of the project folder.

## Status (2026-10-17)
- `source_links.csv`: 2,107 available videos (133 unavailable, listed in `source_links_failed.csv`).
- `/classify-videos` has been run on all of them: 429 food recipe, 144 restaurant, 1,534 other.
  `classified_videos.csv` holds the 573 kept rows (59 low-confidence, not yet reviewed).
- `classification_work/` keeps the per-batch labels so runs resume; delete it only to redo classification.
- Sub-agents occasionally mis-fill fields (batch 9 put confidence into `reason`); `merge_labels.py` validates and refuses to write until fixed.
