"""Extract every TikTok link from the chat export, fetch metadata, write a CSV.

Output columns: video_id, canonical_url, posted_at, caption, hashtags, thumbnail_url.
Unavailable (deleted/private) videos are left out of the CSV and listed in
source_links_failed.csv instead, so nothing disappears silently.

Fetched results are cached in source_links_cache.jsonl, so an interrupted run
resumes where it stopped and re-runs are cheap.

Usage: python -I source_links.py [LIMIT]
  LIMIT  optional; only process the first LIMIT unique videos (testing).
         Default: all videos.
"""
import csv, json, re, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "01_Raw_Data" / "user_data_tiktok.json"
OUT = HERE / "source_links.csv"
FAILED = HERE / "source_links_failed.csv"
CACHE = HERE / "source_links_cache.jsonl"
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else None
DELAY = 1.5  # seconds between requests
COLS = ["video_id", "canonical_url", "posted_at", "caption", "hashtags", "thumbnail_url"]
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
LINK = re.compile(r"tiktokv\.com/share/video/(\d+)")


def load_video_ids():
    d = json.load(open(SRC, encoding="utf-8"))
    chat = d["Direct Message"]["Direct Messages"]["ChatHistory"]
    msgs = sorted(next(iter(chat.values())), key=lambda m: m["Date"])
    ids = {}
    for m in msgs:
        r = LINK.search(m["Content"])
        if r:
            ids.setdefault(r.group(1), None)  # unique, in first-shared order
    return list(ids)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=25).read().decode("utf-8")


def scrape(vid):
    h = get(f"https://www.tiktok.com/@/video/{vid}")
    m = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', h, re.S)
    if not m:
        return None
    vd = json.loads(m.group(1))["__DEFAULT_SCOPE__"].get("webapp.video-detail", {})
    return vd.get("itemInfo", {}).get("itemStruct")


def oembed(vid):
    u = urllib.parse.quote(f"https://www.tiktok.com/@/video/{vid}", safe="")
    return json.loads(get(f"https://www.tiktok.com/oembed?url={u}"))


def fetch(vid):
    """Return (row, None) if available, (None, reason) if unavailable.
    Raises on transient errors so the caller can retry."""
    it = scrape(vid)
    if it and it.get("author"):  # restricted/removed items come back without author or caption
        return {
            "video_id": vid,
            "canonical_url": f"https://www.tiktok.com/@{it['author'].get('uniqueId')}/video/{vid}",
            "posted_at": datetime.fromtimestamp(int(it["createTime"]), timezone.utc).strftime("%Y-%m-%d"),
            "caption": it.get("desc"),
            "hashtags": " ".join(re.findall(r"#(\w+)", it.get("desc", ""))),
            "thumbnail_url": it.get("video", {}).get("cover"),
        }, None
    try:  # page had no video data (e.g. captcha) -> oEmbed still gives caption/author
        o = oembed(vid)
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            return None, f"unavailable (oEmbed HTTP {e.code})"
        raise
    if "@" not in o.get("author_url", ""):  # empty oEmbed payload = removed/restricted video
        return None, "unavailable (no author or caption)"
    return {
        "video_id": vid,
        "canonical_url": o.get("author_url", "") + "/video/" + vid,
        "posted_at": "",
        "caption": o.get("title"),
        "hashtags": " ".join(re.findall(r"#(\w+)", o.get("title", ""))),
        "thumbnail_url": o.get("thumbnail_url"),
    }, None


def fetch_with_retry(vid, tries=4):
    for attempt in range(tries):
        try:
            return fetch(vid)
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):  # page gone
                return None, f"unavailable (HTTP {e.code})"
            err = f"HTTP {e.code}"
        except Exception as e:
            err = f"{type(e).__name__} {e}"
        time.sleep(5 * (attempt + 1))  # back off on rate limits / network blips
    return None, f"error after {tries} tries: {err}"[:150]


def load_cache():
    done = {}
    if CACHE.exists():
        for line in open(CACHE, encoding="utf-8"):
            rec = json.loads(line)
            done[rec["video_id"]] = rec
    return done


def write_csvs(done, ids):
    ok = [done[i]["row"] for i in ids if i in done and done[i]["row"]]
    ok.sort(key=lambda r: r.get("posted_at") or "")
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:  # BOM so Excel reads emoji
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(ok)
    bad = [(i, done[i]["reason"]) for i in ids if i in done and not done[i]["row"]]
    with open(FAILED, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["video_id", "reason"])
        w.writerows(bad)
    return len(ok), len(bad)


def main():
    ids = load_video_ids()
    if LIMIT:
        ids = ids[:LIMIT]
    done = load_cache()
    todo = [i for i in ids if i not in done]
    print(f"{len(ids)} unique videos; {len(done)} cached; {len(todo)} to fetch", flush=True)
    with open(CACHE, "a", encoding="utf-8") as cache:
        for n, vid in enumerate(todo, 1):
            row, reason = fetch_with_retry(vid)
            rec = {"video_id": vid, "row": row, "reason": reason}
            # transient failures are not cached, so a re-run retries them
            if row or (reason and reason.startswith("unavailable")):
                cache.write(json.dumps(rec, ensure_ascii=False) + "\n")
                cache.flush()
            done[vid] = rec
            if n % 25 == 0 or n == len(todo):
                print(f"  {n}/{len(todo)}  last: {vid} {'ok' if row else reason}", flush=True)
            time.sleep(DELAY)
    n_ok, n_bad = write_csvs(done, ids)
    print(f"wrote {OUT.name}: {n_ok} videos; {n_bad} unavailable/failed -> {FAILED.name}")


main()
