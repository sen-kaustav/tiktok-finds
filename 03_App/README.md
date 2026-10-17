# TikTok Finds app

Mobile-first PWA (React + Vite, plain JavaScript) that browses `02_Data_Cleansing/classified_videos.csv`.

## Run

```bash
npm install
npm run dev        # copies the CSV to public/data/, then serves on your Wi-Fi network (vite --host)
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

`npm run dev` and `build` first run `scripts/sync-data.mjs`, which copies the CSV from
`../02_Data_Cleansing/` into `public/data/videos.csv`. The app fetches it at runtime.

## Thumbnails

TikTok thumbnail links expire. Run `python -I ../02_Data_Cleansing/download_thumbnails.py` while
the links are still live; images land in `public/thumbs/<video_id>.jpg`. A card falls back to a
play-glyph placeholder when its image is missing.

`public/data/` and `public/thumbs/` hold private data and are git-ignored.

## Notes

- Meal types and cuisines are grouped into friendly pills in `src/data.js`; the exact value stays as a tag on each card.
- Search matches caption, hashtags, dish, cuisine, meal type, venue, location, dietary and reason, and respects the pills.
- Installing as a PWA on a phone needs HTTPS (or `localhost`); a LAN `http://` address works for browsing but not install.
