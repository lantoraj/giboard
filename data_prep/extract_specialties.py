# -*- coding: utf-8 -*-
"""
Multi-specialty extraction for GI-Board.

Builds per-specialty data folders (public/data/<spec>/) for:
  gastro – gastroenterologie: odbornosti 105 + 115
  chir   – chirurgie: all SZV surgical odbornosti 5xx
  endo   – endokrinologie + diabetologie: odbornosti 103 + 104

Code names come from TWO sources:
  1. Vykony_definice.xlsx – the SZV číselník (4 247 codes)
  2. data_prep/vzp_ciselnik.json – the VZP list (6 261 codes), which is the only
     place naming the ~1 250 "(DRG)" marker codes (prefix 07/90/91). Those codes
     ARE reported in NR-04-01/02 but are absent from the SZV list – e.g. 90915
     Sleeve gastrektomie, 90914 Gastrický bypass (both odbornost 501).
     Generate it with: python data_prep/parse_vzp_ciselnik.py

Gastro keeps its hand-curated labels: its code map is seeded from the existing
public/data/gastro/procedures.json and only extended with DRG markers.

Phases:
  1. code maps from xlsx + VZP číselník
  2. NR-04-01 pass  -> procedures / national / regional / age / gender
  3. NRPZS registry -> providers_registry.json per spec
  4. NR-04-02 pass  -> providers_data / diagnosis_data (+ ARES names)
"""
import csv, json, os, sys, time, urllib.request
from collections import defaultdict

import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

ROOT      = r"C:\Users\lanto\OneDrive\Plocha\Vykony"
XLSX      = os.path.join(ROOT, "Vykony_definice.xlsx")
CSV_01    = os.path.join(ROOT, r"Otevrena-data-NR-04-01-vykony.csv\Otevrena-data-NR-04-01-vykony.csv")
CSV_02    = os.path.join(ROOT, r"Otevrena-data-NR-04-02-vykony-ico.csv\Otevrena-data-NR-04-02-vykony-ico.csv")
NRPZS     = os.path.join(ROOT, "Poskytovatele-2026-03.csv")
DATA_ROOT = os.path.join(ROOT, "gastro-dashboard", "public", "data")
NAMES_CACHE = os.path.join(DATA_ROOT, "provider_names.json")

# ── Specialty definitions ─────────────────────────────────────────────────────
def is_gastro(odb): return odb in ("105", "115")
def is_chir(odb):   return odb.startswith("5")
def is_endo(odb):   return odb in ("103", "104")

SPECS = {
    "gastro": {"match": is_gastro, "obory": lambda o: "gastroenter" in o},
    "chir":   {"match": is_chir,   "obory": lambda o: "chirurgie" in o},
    "endo":   {"match": is_endo,   "obory": lambda o: ("endokrinolog" in o) or ("diabetolog" in o)},
}

# Abbreviations to keep uppercase when sentence-casing SZV names
ABBREV = {"GIT", "EPT", "ERCP", "EUS", "CT", "MR", "NMR", "RTG", "PH", "ND-YAG",
          "YAG", "PTC", "EKG", "UZ", "TEP", "PŽK", "CŽK", "NGS", "PEG", "RFA",
          "II", "III", "IV", "HIV", "TU", "LU", "A", "V.", "N.", "M."}

def nice_name(raw):
    s = " ".join(raw.split())            # collapse whitespace/newlines
    prefix = ""
    if s.upper().startswith("(DRG)"):    # keep the marker tag visible
        prefix, s = "(DRG) ", s[5:].strip()
    words = s.lower().split(" ")
    out = []
    for i, w in enumerate(words):
        wu = w.upper()
        if wu in ABBREV:
            out.append(wu)
        elif i == 0:
            out.append(w[:1].upper() + w[1:])
        else:
            out.append(w)
    return prefix + " ".join(out)

# ── Phase 1: code maps ────────────────────────────────────────────────────────
print("Phase 1: loading SZV číselník…", flush=True)
wb = openpyxl.load_workbook(XLSX, read_only=True)
ws = wb["Sheet1"]
code_maps = {sid: {} for sid in SPECS}
for row in ws.iter_rows(min_row=2, values_only=True):
    odb, kod, name = str(row[0] or ""), str(row[1] or ""), str(row[2] or "")
    if not kod or not name:
        continue
    for sid, spec in SPECS.items():
        if spec["match"](odb):
            code_maps[sid][kod] = nice_name(name)

# Gastro keeps its hand-curated labels – seed from the existing output
gastro_json = os.path.join(DATA_ROOT, "gastro", "procedures.json")
if os.path.exists(gastro_json):
    with open(gastro_json, encoding="utf-8") as f:
        existing = json.load(f)
    for p in existing:
        code_maps["gastro"][p["kod"]] = p["label"]      # overwrite generated name
    print(f"  gastro: seeded {len(existing)} hand-curated labels", flush=True)

# Add the "(DRG)" marker codes, which only the VZP list names
vzp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vzp_ciselnik.json")
if os.path.exists(vzp_path):
    with open(vzp_path, encoding="utf-8") as f:
        vzp = json.load(f)
    added = {sid: 0 for sid in SPECS}
    for kod, rec in vzp.items():
        odb = rec.get("odb", "")
        for sid, spec in SPECS.items():
            if spec["match"](odb) and kod not in code_maps[sid]:
                code_maps[sid][kod] = nice_name(rec["nazev"])
                added[sid] += 1
    print(f"  VZP číselník: +{added} kodu", flush=True)
else:
    print(f"  WARNING: {vzp_path} chybi – DRG markery nebudou zahrnuty", flush=True)

for sid, m in code_maps.items():
    print(f"  {sid}: {len(m)} codes total")

ALL_CODES = {}
for sid, m in code_maps.items():
    for kod in m:
        ALL_CODES.setdefault(kod, []).append(sid)

# ── Shared helpers (same semantics as extract.py) ─────────────────────────────
REGION_MAP = {
    "CZ010": "Praha", "CZ020": "Středočeský kraj", "CZ031": "Jihočeský kraj",
    "CZ032": "Plzeňský kraj", "CZ041": "Karlovarský kraj", "CZ042": "Ústecký kraj",
    "CZ051": "Liberecký kraj", "CZ052": "Královéhradecký kraj", "CZ053": "Pardubický kraj",
    "CZ063": "Kraj Vysočina", "CZ064": "Jihomoravský kraj", "CZ071": "Olomoucký kraj",
    "CZ072": "Zlínský kraj", "CZ080": "Moravskoslezský kraj",
}
def get_region(okres):
    for prefix, name in REGION_MAP.items():
        if okres.startswith(prefix):
            return name
    return "Neznámý"

def decode_age(s):
    if len(s) == 8 and s.startswith("66"):
        start = int(s[2:5]); end_raw = int(s[5:8])
        return f"{start}+" if end_raw >= 990 else f"{start}-{end_raw}"
    return s

GENDER_LABELS = {"1": "Muži", "2": "Ženy", "9": "Neurčeno", "99": "Neurčeno"}

def write_json(folder, name, data):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote {os.path.relpath(path, DATA_ROOT)} ({os.path.getsize(path)/1024:.1f} KB)", flush=True)

# ── Phase 2: NR-04-01 ─────────────────────────────────────────────────────────
print("Phase 2: NR-04-01 pass…", flush=True)
mk = lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0, "pocet_kontaktu": 0}))
national = {sid: mk() for sid in SPECS}
regional = {sid: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0, "pocet_kontaktu": 0}))) for sid in SPECS}
age_data = {sid: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0}))) for sid in SPECS}
gender_data = {sid: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0}))) for sid in SPECS}

total = hits = 0
with open(CSV_01, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        total += 1
        if total % 2_000_000 == 0:
            print(f"  {total:,} rows, hits {hits:,}", flush=True)
        rok, vek, pohlavi, okres, kod, mnozstvi, pocet_pac, pocet_kontaktu = row
        kod = kod.strip('"')
        specs = ALL_CODES.get(kod)
        if not specs:
            continue
        hits += 1
        rok = rok.strip('"'); vek = vek.strip('"'); pohlavi = pohlavi.strip('"'); okres = okres.strip('"')
        mn = float(mnozstvi); pp = int(pocet_pac); pk = int(pocet_kontaktu)
        region = get_region(okres); age = decode_age(vek)
        gender = GENDER_LABELS.get(pohlavi, pohlavi)
        for sid in specs:
            n = national[sid][kod][rok]
            n["mnozstvi"] += mn; n["pocet_pacientu"] += pp; n["pocet_kontaktu"] += pk
            r = regional[sid][kod][region][rok]
            r["mnozstvi"] += mn; r["pocet_pacientu"] += pp; r["pocet_kontaktu"] += pk
            a = age_data[sid][kod][rok][age]
            a["mnozstvi"] += mn; a["pocet_pacientu"] += pp
            g = gender_data[sid][kod][rok][gender]
            g["mnozstvi"] += mn; g["pocet_pacientu"] += pp

print(f"  done: {total:,} rows, {hits:,} matched", flush=True)

for sid in SPECS:
    folder = os.path.join(DATA_ROOT, sid)
    procedures = []
    for kod in sorted(national[sid].keys()):
        total_mn = sum(v["mnozstvi"] for v in national[sid][kod].values())
        total_pp = sum(v["pocet_pacientu"] for v in national[sid][kod].values())
        procedures.append({
            "kod": kod, "szv_code": kod,
            "label": code_maps[sid].get(kod, f"Výkon {kod}"),
            "total_mnozstvi": total_mn, "total_pacientu": total_pp,
        })
    write_json(folder, "procedures.json", procedures)
    write_json(folder, "national_trends.json", {k: dict(v) for k, v in national[sid].items()})
    write_json(folder, "regional_data.json", {k: {r: dict(yv) for r, yv in rv.items()} for k, rv in regional[sid].items()})
    write_json(folder, "age_data.json", {k: {y: dict(av) for y, av in yv.items()} for k, yv in age_data[sid].items()})
    write_json(folder, "gender_data.json", {k: {y: dict(gv) for y, gv in yv.items()} for k, yv in gender_data[sid].items()})

# Top-10 preview per specialty (for choosing KEY_CODES)
for sid in SPECS:
    tops = sorted(
        ((kod, sum(v["mnozstvi"] for v in yv.values())) for kod, yv in national[sid].items()),
        key=lambda x: -x[1])[:12]
    print(f"TOP {sid}:")
    for kod, mn in tops:
        print(f"    {kod} {code_maps[sid].get(kod, '?')[:60]} = {mn:,.0f}")

# ── Phase 3: NRPZS registry ───────────────────────────────────────────────────
print("Phase 3: NRPZS registry…", flush=True)
registries = {sid: {} for sid in SPECS}
with open(NRPZS, "r", encoding="cp1250", errors="replace") as f:
    reader = csv.reader(f, delimiter=";")
    header = next(reader)
    idx = {name: i for i, name in enumerate(header)}
    for row in reader:
        try:
            obor = (row[idx["OborPece"]] or "").lower()
            ico  = (row[idx["Ico"]] or "").strip().zfill(8)
            if not obor or not ico or ico == "00000000":
                continue
            for sid, spec in SPECS.items():
                if spec["obory"](obor) and ico not in registries[sid]:
                    name = row[idx["PoskytovatelNazev"]] or ico
                    registries[sid][ico] = {
                        "ico": ico, "name": name,
                        "short_name": name if len(name) <= 60 else name[:57] + "…",
                        "city": row[idx["ObecSidlo"]] or row[idx["Obec"]] or "",
                        "kraj": row[idx["KrajSidlo"]] or row[idx["Kraj"]] or "",
                        "psc":  row[idx["PscSidlo"]] or row[idx["Psc"]] or "",
                        "obor": obor,
                    }
        except (IndexError, KeyError):
            continue

for sid in SPECS:
    write_json(os.path.join(DATA_ROOT, sid), "providers_registry.json",
               sorted(registries[sid].values(), key=lambda x: x["name"]))
    print(f"  {sid}: {len(registries[sid])} providers in registry")

# ── Phase 4: NR-04-02 ─────────────────────────────────────────────────────────
print("Phase 4: NR-04-02 pass… (largest file)", flush=True)
provider_agg = {sid: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: [0.0, 0]))) for sid in SPECS}
diagnosis_agg = {sid: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: [0.0, 0]))) for sid in SPECS}

total = hits = 0
with open(CSV_02, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        total += 1
        if total % 5_000_000 == 0:
            print(f"  {total:,} rows, hits {hits:,}", flush=True)
        rok, ico, kod, diag, mn, pp, _ = row
        kod = kod.strip('"')
        specs = ALL_CODES.get(kod)
        if not specs:
            continue
        hits += 1
        rok = rok.strip('"'); ico = ico.strip('"').zfill(8); diag = diag.strip('"')[:3]
        try:
            mn_val = float(mn); pp_val = int(float(pp))
        except (ValueError, TypeError):
            continue
        for sid in specs:
            pa = provider_agg[sid][ico][kod][rok]
            pa[0] += mn_val; pa[1] += pp_val
            da = diagnosis_agg[sid][kod][diag][rok]
            da[0] += mn_val; da[1] += pp_val

print(f"  done: {total:,} rows, {hits:,} matched", flush=True)

# ── ARES names (shared cache) ─────────────────────────────────────────────────
if os.path.exists(NAMES_CACHE):
    with open(NAMES_CACHE, "r", encoding="utf-8") as f:
        provider_names = json.load(f)
else:
    provider_names = {}

all_icos = sorted({ico for sid in SPECS for ico in provider_agg[sid]})
# NRPZS registry already has names – use them first to avoid ARES traffic
for sid in SPECS:
    for ico, info in registries[sid].items():
        if ico not in provider_names:
            provider_names[ico] = {"name": info["name"], "city": info["city"],
                                   "kraj": info["kraj"], "psc": info["psc"]}

missing = [ico for ico in all_icos if ico not in provider_names]
print(f"ARES lookup for {len(missing)} ICOs…", flush=True)
ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}"
for i, ico in enumerate(missing):
    try:
        req = urllib.request.Request(ARES_URL.format(ico=ico), headers={"User-Agent": "gi-board/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        sidlo = data.get("sidlo", {})
        provider_names[ico] = {"name": data.get("obchodniJmeno", ico),
                               "city": sidlo.get("nazevObce", ""),
                               "kraj": sidlo.get("nazevKraje", ""),
                               "psc": str(sidlo.get("psc", ""))}
        time.sleep(0.15)
        if (i + 1) % 100 == 0:
            print(f"  ARES {i+1}/{len(missing)}", flush=True)
            with open(NAMES_CACHE, "w", encoding="utf-8") as f:
                json.dump(provider_names, f, ensure_ascii=False)
    except Exception as e:
        provider_names[ico] = {"name": ico, "city": "", "kraj": "", "psc": ""}
        time.sleep(0.5)

with open(NAMES_CACHE, "w", encoding="utf-8") as f:
    json.dump(provider_names, f, ensure_ascii=False)
print(f"provider_names.json saved ({len(provider_names)} entries)", flush=True)

# ── providers_data + diagnosis_data per spec ─────────────────────────────────
for sid in SPECS:
    folder = os.path.join(DATA_ROOT, sid)
    providers_out = []
    for ico, by_kod in provider_agg[sid].items():
        total_mn = sum(v[0] for kd in by_kod.values() for v in kd.values())
        procs = {kod: {rok: {"mn": round(v[0]), "pp": v[1]} for rok, v in by_rok.items()}
                 for kod, by_rok in by_kod.items()}
        info = provider_names.get(ico, {"name": ico, "city": "", "kraj": "", "psc": ""})
        providers_out.append({"ico": ico, "name": info["name"], "city": info["city"],
                              "kraj": info["kraj"], "total": round(total_mn), "procs": procs})
    providers_out.sort(key=lambda x: -x["total"])
    write_json(folder, "providers_data.json", providers_out)

    diag_out = {}
    for kod, by_diag in diagnosis_agg[sid].items():
        entries = []
        for diag, by_rok in by_diag.items():
            tot = sum(v[0] for v in by_rok.values())
            entries.append({"diag": diag, "total": round(tot),
                            "years": {rok: {"mn": round(v[0]), "pp": v[1]} for rok, v in by_rok.items()}})
        entries.sort(key=lambda x: -x["total"])
        # No cap: the MKN-10 page builds its diagnosis universe from the union of
        # these lists, so truncating per code silently shrinks it (a top-40 cap
        # cut gastro from 1 513 to 357 distinct diagnoses). Files are lazy-loaded.
        diag_out[kod] = entries
    write_json(folder, "diagnosis_data.json", diag_out)

print("ALL DONE", flush=True)
