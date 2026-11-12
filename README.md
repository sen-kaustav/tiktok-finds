# TikTok Finds

A searchable catalogue of the TikTok videos two friends shared in a private chat since January 2025. Only **food recipes** and **restaurants** are kept, with sub-categories (cuisine, meal type, location, venue, dietary) for searching. Everything else is dropped.

The catalogue is a mobile-first PWA backed by Supabase. Live at https://sen-kaustav.github.io/tiktok-finds/ (invite-only, email one-time-code sign-in).

## How it works

```
TikTok data export ──► source_links.py ──► /classify-videos ──► load_to_supabase.py ──► Supabase ◄── PWA
 (01_Raw_Data)          scrape metadata      Claude sub-agents    upload_thumbnails.py   (RLS)    (03_App)
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `01_Raw_Data/` | Private TikTok export. Git-ignored; never commit or upload it. |
| `02_Data_Cleansing/` | Python pipeline: extract links, fetch metadata, download and upload thumbnails, load to Supabase. |
| `03_App/` | The PWA (React + Vite, JavaScript). See [03_App/README.md](03_App/README.md). |
| `supabase/migrations/` | Versioned SQL: `videos` table, row-level security, private `thumbs` bucket. |
| `.claude/skills/classify-videos/` | Project skill (`/classify-videos`) holding the classification rules and taxonomy. |
| `.github/workflows/` | `pages.yml` deploys the app to GitHub Pages; `keepalive.yml` pings Supabase daily so the free project isn't paused. |

## Data pipeline

Run from `02_Data_Cleansing/` with `python -I`:

1. `source_links.py [LIMIT]` extracts the video links, scrapes metadata (caption, hashtags, thumbnail) and writes `source_links.csv`. Unavailable videos go to `source_links_failed.csv`. Results are cached, so interrupted runs resume. Requests are rate-limited; keep the delay and backoff.
2. `/classify-videos` (in Claude Code) labels each video `food recipe`, `restaurant` or `other` and writes `classified_videos.csv` with only the first two.
3. `download_thumbnails.py` saves thumbnails locally. Thumbnail URLs expire, so run it soon after step 1.
4. `load_to_supabase.py` upserts the rows into the `videos` table.
5. `upload_thumbnails.py` uploads the images to the private `thumbs` bucket.

Steps 4 and 5 need `02_Data_Cleansing/.env` (see `.env.example`) with the Supabase URL and service-role key. Never commit it.

## Running the app

```bash
cd 03_App
npm install
npm run dev
```

Create `03_App/.env.local` first (see `.env.example`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key). Details, including phone testing, are in [03_App/README.md](03_App/README.md).

## Supabase

- Invite-only: public signups are off. Add or remove people under Authentication > Users.
- Row-level security: signed-in users can read and write `videos`; anonymous users get nothing.
- The service-role key bypasses RLS. Keep it in the untracked `.env` only, never in the app or the workflow.

## Status

573 videos in the catalogue (429 food recipe, 144 restaurant), picked from 2,107 available videos. The app supports search, filters, offline use and editing a card's category, cuisine and tags by long-press.

Possible next steps: add the friend's account, and a manual add-a-video flow (Supabase Edge Function for the TikTok scrape).
