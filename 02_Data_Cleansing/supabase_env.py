"""Shared Supabase settings for the loader scripts: reads 02_Data_Cleansing/.env."""
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_env():
    env = dict(os.environ)
    path = HERE / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip("\"'"))
    url, key = env.get("SUPABASE_URL"), env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in 02_Data_Cleansing/.env")
    return url.rstrip("/"), {"apikey": key, "Authorization": f"Bearer {key}"}
