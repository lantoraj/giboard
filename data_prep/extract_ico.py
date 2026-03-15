"""
Extract gastroenterology data from NR-04-02 (provider-level dataset).
Produces:
  providers_data.json  – per provider: volumes by kod+year
  diagnosis_data.json  – per procedure: volumes by diagnosis+year
  provider_names.json  – ICO → name, city, kraj (fetched from ARES)

Source: Otevrena-data-NR-04-02-vykony-ico.csv
Columns: rok, ICO, kod, diagnoza, mnozstvi, pocet_pacientu, pocet_kontaktu
"""

import csv, json, os, time, urllib.request, urllib.error
from collections import defaultdict

CSV_PATH = r"C:\Users\lanto\OneDrive\Plocha\Vykony\Otevrena-data-NR-04-02-vykony-ico.csv\Otevrena-data-NR-04-02-vykony-ico.csv"
OUT_DIR  = r"C:\Users\lanto\OneDrive\Plocha\Vykony\gastro-dashboard\public\data"

# ── same SZV gastro codes as extract.py ───────────────────────────────────────
GASTRO_MAP = {
    # Specialty 105 – Gastroenterologie ambulantní
    "15021": "Komplexní vyšetření gastroenterologem",
    "15022": "Cílené vyšetření gastroenterologem",
    "15023": "Kontrolní vyšetření gastroenterologem",
    "15040": "Signální výkon – neodkladná digestivní endoskopie",
    "15130": "Diagnostický test v gastroenterologii",
    "15140": "Určování vodíku ve vydechovaném vzduchu",
    "15143": "Dechový test s 13C-ureou (H. pylori)",
    "15160": "pH metrie jícnu",
    "15162": "Jícnová manometrie s vysokým rozlišením (HRM)",
    "15180": "Rychlý ureázový test (CLO test)",
    "15195": "Elastografie jater",
    "15210": "Anorektální manometrie s vysokým rozlišením (HRAM)",
    "15250": "Sonografie epigastria s barevným mapováním",
    "15372": "Biopsie tenkého střeva bioptickou kapslí",
    "15470": "Kapslová enteroskopie",
    # Specialty 115 – Endoskopie
    "15401": "Gastroskopie",
    "15402": "Rektoskopie",
    "15403": "Koloskopie neúplná (sigmoideoskopie)",
    "15404": "Koloskopie",
    "15406": "Enteroskopie části tenkého střeva",
    "15408": "Anoskopie",
    "15410": "Endoskopická ultrasonografie (EUS)",
    "15412": "Cholangio-pankreatoskopie",
    "15420": "Perorální cholangioskopie (Mother-Baby)",
    "15430": "Endoskopická retrográdní cholangiopankreatografie (ERCP)",
    "15440": "Odběr bioptického materiálu při endoskopii",
    "15450": "Laparoskopie diagnostická",
    "15460": "Cílená biopsie jater nebo orgánu dutiny břišní",
    "15473": "Balonková videoenteroskopie",
    "15475": "Endoskopická mukózní resekce (EMR)",
    "15480": "Endoskopická septotomie Zenkerova divertiklu",
    "15101": "Koloskopie – okultní krvácení, neg. nález",
    "15103": "Koloskopie – okultní krvácení, poz. nález",
    "15105": "Screeningová koloskopie – neg. nález",
    "15107": "Screeningová koloskopie – poz. nález",
    "15900": "Endoskopická dilatace stenóz trávicí trubice",
    "15910": "Endoskopická extrakce cizího tělesa",
    "15920": "Endoskopické stavění krvácení",
    "15930": "Endoskopická laserová fotokoagulace v GIT",
    "15935": "Endoskopická fotokoagulace (argon plasma, APC)",
    "15950": "Polypektomie endoskopická",
    "15960": "Perkutánní endoskopická gastrostomie (PEG)",
    "15964": "Endoskopická vakuová terapie (EVT)",
    "15965": "Endoskopická nekrektomie",
    "15970": "Endoskopická ligace jícnových varixů",
    "15972": "Endoskopická sklerotizace jícnových varixů",
    "15980": "Endoskopická ligace hemoroidů",
    "15990": "Endoskopická papilosfinkterotomie (EPT)",
    "15992": "Extrakce konkrementů ze žlučových cest",
    "15993": "Endoskopické zavedení nasobiliárního katetru",
    "15994": "Mechanická lithotripsie choledocholithiázy",
    "15998": "Vnitřní duodenobiliární drenáž (endoskopická)",
    "15999": "Extrakce konkrementu po EPT z d. Wirsungi",
    # Pokročilé endoskopické výkony
    "15024": "Endoskopická submukózní disekce (ESD)",
    "15026": "Jícnová impedance – 24 hodin",
    "15028": "Radiofrekvenční ablace (RFA) jícnu – HALO 360",
    "15030": "Radiofrekvenční ablace (RFA) jícnu – HALO 90",
    "15062": "Intraduktální elektrohydraulická litotripsie",
    "15064": "Endoskopická transmurální resekce",
    "15066": "Endosonograficky navigovaná drenáž v GIT",
    "15068": "Perorální endoskopická myotomie (POEM)",
    "15070": "Endoskopická sutura",
    "15135": "Diagnostika a terapie píštělí dutiny břišní",
    "15374": "Necílená jaterní biopsie",
    "15376": "Transjugulární hepatální nebo renální biopsie",
    "15379": "Perkutánní transhepatální cholangiografie",
    "15381": "Transhepatální cholangioskopie",
    "15510": "Léčba cholelitiázy extrakorporální litotripsí",
    "15710": "Zavedení endoprotézy perkutánní cestou",
    "15720": "Perkutánní transhepatální extrakce konkrementů",
}
GASTRO_CODES = set(GASTRO_MAP.keys())

# ── Aggregation structures ─────────────────────────────────────────────────────
# provider_agg[ico][kod][rok] = [sum_mnozstvi, sum_pacientu]
provider_agg = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: [0.0, 0])))
# diagnosis_agg[kod][diagnoza][rok] = [sum_mnozstvi, sum_pacientu]
diagnosis_agg = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: [0.0, 0])))

print("Reading CSV...")
total_rows = 0
gastro_rows = 0

with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        total_rows += 1
        if total_rows % 5_000_000 == 0:
            print(f"  {total_rows:,} rows, gastro: {gastro_rows:,}", flush=True)

        rok, ico, kod, diag, mn, pp, _ = row
        kod  = kod.strip('"')
        if kod not in GASTRO_CODES:
            continue

        gastro_rows += 1
        rok  = rok.strip('"')
        ico  = ico.strip('"').zfill(8)   # pad to 8 digits
        diag = diag.strip('"')[:3]        # keep only 3-char ICD prefix
        try:
            mn_val = float(mn)
            pp_val = int(float(pp))
        except (ValueError, TypeError):
            continue

        provider_agg[ico][kod][rok][0] += mn_val
        provider_agg[ico][kod][rok][1] += pp_val
        diagnosis_agg[kod][diag][rok][0] += mn_val
        diagnosis_agg[kod][diag][rok][1] += pp_val

print(f"Done. Total: {total_rows:,}, gastro: {gastro_rows:,}")
print(f"Unique providers: {len(provider_agg)}")

# ── ARES lookup ────────────────────────────────────────────────────────────────
ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}"
NAMES_CACHE = os.path.join(OUT_DIR, "provider_names.json")

# Load existing cache if present
if os.path.exists(NAMES_CACHE):
    with open(NAMES_CACHE, "r", encoding="utf-8") as f:
        provider_names = json.load(f)
    print(f"Loaded {len(provider_names)} cached provider names")
else:
    provider_names = {}

all_icos = sorted(provider_agg.keys())
missing = [ico for ico in all_icos if ico not in provider_names]
print(f"Fetching {len(missing)} new ICOs from ARES...")

for i, ico in enumerate(missing):
    url = ARES_URL.format(ico=ico)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "gastro-dashboard/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        sidlo = data.get("sidlo", {})
        provider_names[ico] = {
            "name":  data.get("obchodniJmeno", ico),
            "city":  sidlo.get("nazevObce", ""),
            "kraj":  sidlo.get("nazevKraje", ""),
            "psc":   str(sidlo.get("psc", "")),
        }
        if (i + 1) % 20 == 0:
            print(f"  {i+1}/{len(missing)}: {ico} -> {provider_names[ico]['name'][:50]}")
            # Save intermediate cache
            with open(NAMES_CACHE, "w", encoding="utf-8") as f:
                json.dump(provider_names, f, ensure_ascii=False)
        time.sleep(0.15)   # polite rate limit: ~6 req/s
    except Exception as e:
        print(f"  ARES error for {ico}: {e}")
        provider_names[ico] = {"name": ico, "city": "", "kraj": "", "psc": ""}
        time.sleep(0.5)

# Final cache save
with open(NAMES_CACHE, "w", encoding="utf-8") as f:
    json.dump(provider_names, f, ensure_ascii=False, indent=2)
print(f"Saved provider_names.json ({len(provider_names)} entries)")

# ── Build providers_data.json ──────────────────────────────────────────────────
# Format: list sorted by total mnozstvi (all gastro), with per-kod year breakdown
providers_out = []
for ico, by_kod in provider_agg.items():
    total_mn = sum(
        v[0]
        for kd in by_kod.values()
        for v in kd.values()
    )
    procedures = {}
    for kod, by_rok in by_kod.items():
        procedures[kod] = {
            rok: {"mn": round(vals[0]), "pp": vals[1]}
            for rok, vals in by_rok.items()
        }
    info = provider_names.get(ico, {"name": ico, "city": "", "kraj": "", "psc": ""})
    providers_out.append({
        "ico":    ico,
        "name":   info["name"],
        "city":   info["city"],
        "kraj":   info["kraj"],
        "total":  round(total_mn),
        "procs":  procedures,
    })

providers_out.sort(key=lambda x: -x["total"])

path = os.path.join(OUT_DIR, "providers_data.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(providers_out, f, ensure_ascii=False)
print(f"Wrote providers_data.json ({len(providers_out)} providers, {os.path.getsize(path)/1024:.1f} KB)")

# ── Build diagnosis_data.json ─────────────────────────────────────────────────
# Format: { kod: [ { diag, label?, years: {rok: {mn,pp}} } ] sorted by total }
diag_out = {}
for kod, by_diag in diagnosis_agg.items():
    entries = []
    for diag, by_rok in by_diag.items():
        total = sum(v[0] for v in by_rok.values())
        entries.append({
            "diag":  diag,
            "total": round(total),
            "years": {rok: {"mn": round(v[0]), "pp": v[1]} for rok, v in by_rok.items()},
        })
    entries.sort(key=lambda x: -x["total"])
    diag_out[kod] = entries

path = os.path.join(OUT_DIR, "diagnosis_data.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(diag_out, f, ensure_ascii=False)
print(f"Wrote diagnosis_data.json ({len(diag_out)} codes, {os.path.getsize(path)/1024:.1f} KB)")

print("\nAll done.")
