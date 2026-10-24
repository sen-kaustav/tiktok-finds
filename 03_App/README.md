# TikTok Finds app

Mobile-first PWA (React + Vite, plain JavaScript) that browses the catalogue stored in Supabase (table `videos`, private `thumbs` bucket). Sign-in is by emailed one-time code; only invited accounts can get in.

## Run

```bash
npm install
npm run dev        # serves on your Wi-Fi network (vite --host)
npm run build      # production build in dist/
npm run preview    # serve the build on your Wi-Fi network too (vite preview --host)
```

## Test on your phone (same Wi-Fi)

1. Put your phone and computer on the same Wi-Fi network.
2. Run `npm run dev`. Vite prints two addresses:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.x.x:5173/
   ```
3. Open the **Network** address in your phone's browser.
4. If it won't load, Windows Firewall is probably blocking Node. Allow it for **Private networks**
   when the prompt appears (or in Windows Security > Firewall > Allow an app). Also check the
   Wi-Fi isn't a guest network with device isolation.

The `--host` flag is already set in `package.json`, so no extra options are needed.

## Configuration

Create `.env.local` (git-ignored; see `.env.example`) with `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` (the publishable key). Never put the secret/service-role key here.

## Data and thumbnails

The app selects all rows from `videos` and signs the thumbnail URLs for a week. The list and URLs
are cached in local storage so the app opens offline, and the service worker caches the images by
URL without the token. Loading new data is done from the pipeline (`../02_Data_Cleansing/load_to_supabase.py`
and `upload_thumbnails.py`). A card falls back to a play-glyph placeholder when its image is missing.

## Notes

- Meal types and cuisines are grouped into friendly pills in `src/data.js`; the exact value stays as a tag on each card.
- Search matches caption, hashtags, dish, cuisine, meal type, venue, location, dietary and reason, and respects the pills.
- Installing as a PWA on a phone needs HTTPS (or `localhost`); a LAN `http://` address works for browsing but not install.
- Long-press a card (about half a second) to open the edit screen (`components/Edit.jsx`). Saving updates the `videos` row in Supabase and the local cache, with an Undo toast. Picking the category Other and saving deletes the row.
