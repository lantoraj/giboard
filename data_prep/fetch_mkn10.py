"""
Fetch Czech MKN-10 diagnosis names from mkn10.uzis.cz for all codes in diagnosis_data.json.
Saves result to public/data/mkn10_lookup.json  {code: name}
"""

import json, time, re, os, sys
from pathlib import Path
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent.parent
DATA_IN  = ROOT / "public" / "data" / "diagnosis_data.json"
DATA_OUT = ROOT / "public" / "data" / "mkn10_lookup.json"
CACHE    = ROOT / "data_prep" / "mkn10_cache.json"

# Load existing cache
if CACHE.exists():
    with open(CACHE, encoding="utf-8") as f:
        lookup = json.load(f)
    print(f"Loaded {len(lookup)} cached entries")
else:
    lookup = {}

# Collect unique codes
with open(DATA_IN, encoding="utf-8") as f:
    data = json.load(f)

codes = set()
for diaglist in data.values():
    for item in diaglist:
        c = item.get("diag", "").strip()
        if c and len(c) >= 2:
            codes.add(c)

codes = sorted(codes - set(lookup.keys()))
print(f"Codes to fetch: {len(codes)}")

def fetch_name(code):
    url = f"https://mkn10.uzis.cz/prohlizec/{code}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        # Try <h1> or <title> first
        m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL | re.IGNORECASE)
        if m:
            name = re.sub(r'<[^>]+>', '', m.group(1)).strip()
            # Remove the code prefix if present (e.g. "K30 Funkční dyspepsie" → "Funkční dyspepsie")
            name = re.sub(r'^' + re.escape(code) + r'\s*[-–]?\s*', '', name).strip()
            if name:
                return name
        # Fallback: look for code in text near a dash/colon
        m = re.search(re.escape(code) + r'\s*[-–:]\s*([^\n<]{5,80})', html)
        if m:
            return m.group(1).strip()
        # Title tag fallback
        m = re.search(r'<title>(.*?)</title>', html, re.DOTALL | re.IGNORECASE)
        if m:
            t = re.sub(r'<[^>]+>', '', m.group(1)).strip()
            t = re.sub(r'^' + re.escape(code) + r'\s*[-–]?\s*', '', t).strip()
            # remove site name suffix
            t = re.sub(r'\s*[|\-–].*$', '', t).strip()
            if t and t.lower() not in ('mkn-10', 'mkn10'):
                return t
        return None
    except Exception as e:
        return None

total = len(codes)
for i, code in enumerate(codes):
    name = fetch_name(code)
    if name:
        lookup[code] = name
        status = f"✓ {code}: {name[:50]}"
    else:
        lookup[code] = code  # fallback = code itself
        status = f"? {code}: (not found)"

    sys.stdout.write(f"\r[{i+1}/{total}] {status:<70}")
    sys.stdout.flush()

    # Save cache every 50
    if (i + 1) % 50 == 0:
        with open(CACHE, "w", encoding="utf-8") as f:
            json.dump(lookup, f, ensure_ascii=False, indent=2)

    time.sleep(0.18)

print()

# Write final output (only found names, skip codes where name == code)
final = {k: v for k, v in lookup.items() if v != k}
with open(DATA_OUT, "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False, indent=2)
with open(CACHE, "w", encoding="utf-8") as f:
    json.dump(lookup, f, ensure_ascii=False, indent=2)

print(f"\nDone. {len(final)} names saved to {DATA_OUT}")
