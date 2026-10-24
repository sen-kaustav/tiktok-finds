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
  - `classified_videos.csv`: final output of the skill below (food recipe + restaurant rows only). Local, git-ignored intermediate; the source of truth is now Supabase.
  - `download_thumbnails.py`: saves each row's thumbnail to `03_App/public/thumbs/<video_id>.jpg` (links expire, so run soon after refreshing the CSV). Run: `python -I download_thumbnails.py`. Local scratch only (git-ignored).
  - `load_to_supabase.py`: upserts `classified_videos.csv` into the `videos` table. Run: `python -I load_to_supabase.py`.
  - `upload_thumbnails.py`: uploads `03_App/public/thumbs/*.jpg` to the private `thumbs` bucket and sets `thumb_path`; ends with OK only when the bucket count matches. Run: `python -I upload_thumbnails.py`.
  - `supabase_env.py`: reads `02_Data_Cleansing/.env` (see `.env.example`).
- `supabase/migrations/`: versioned SQL for the Supabase project (`videos` table, RLS, private `thumbs` bucket).
- `03_App/`: the PWA (React + Vite, JavaScript). Being moved to read from Supabase (login via email OTP, signed thumbnail URLs); until that lands on this branch it still reads the old CSV; see its README. Design mock-up: the "TikTok Finds App Mockup" Artifact, built on the TikTok Finds design system.
- `.claude/skills/classify-videos/`: project skill (`/classify-videos`) that classifies
  `source_links.csv` using sub-agents, adds category and sub-category columns, and writes
  `classified_videos.csv`. Rules and taxonomy live in its `SKILL.md`.

## Supabase
- Project `qridaraosgayemrotjtl` (eu-west-1, free tier): https://qridaraosgayemrotjtl.supabase.co. Invite-only; any signed-in user can read and write `videos`; anonymous users get nothing (RLS).
- Thumbnails live in the private `thumbs` bucket as `<video_id>.jpg`, referenced by `videos.thumb_path`.
- Keys: the secret (service-role) key bypasses RLS and lives only in the untracked `02_Data_Cleansing/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); never commit it or put it in the workflow. The publishable key goes in the app via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`03_App/.env.local`, git-ignored) and is safe in the bundle only because of RLS.
- Work is on branch `supabase-backend`; merge to main only after verification, because main still builds from the CSV.

## How metadata is fetched
`yt-dlp` fails on TikTok here. What works: rewrite the link to `tiktok.com/@/video/<id>`,
scrape the `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON from the page, and fall back to the
public oEmbed endpoint. Thumbnail URLs expire, so images should be downloaded before the
app depends on them.

## Decisions made
- Categories: `food recipe`, `restaurant`, `other`.
- Always `other`: cocktails and drink recipes, Too Good To Go / bakery bags, grocery finds
  and supermarket reviews, bars/pubs featured only for drinks.
- Final CSV (and the Supabase table) keeps only food recipe and restaurant rows, with all source columns retained.

## Conventions
- Run Python with `python -I`. Write CSVs as UTF-8 with BOM (`utf-8-sig`) so Excel shows emoji.
- Be polite to TikTok: keep the delay between requests and the retry/backoff in `source_links.py`.
- Keep scratch files out of the project folder.

## Status (2026-10-24)
- `source_links.csv`: 2,107 available videos (133 unavailable, listed in `source_links_failed.csv`).
- `/classify-videos` has been run on all of them: 429 food recipe, 144 restaurant, 1,534 other.
  `classified_videos.csv` holds the 573 kept rows (59 low-confidence, not yet reviewed).
- `classification_work/` keeps the per-batch labels so runs resume; delete it only to redo classification.
- Supabase holds all 573 rows and 573 thumbnails (checked). Phase 3 (app switch-over), Phase 4 (deploy) and Phase 6 (verification) of the plan are still to do.
- Sub-agents occasionally mis-fill fields (batch 9 put confidence into `reason`); `merge_labels.py` validates and refuses to write until fixed.
