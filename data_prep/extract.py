"""
Data extraction script for Czech NRHZS gastroenterology procedure data.
Reads raw CSV (~1.1 GB) and produces pre-aggregated JSON files for the dashboard.

IMPORTANT: The CSV uses official SZV billing codes (15xxx) directly.
  - Specialty 105 = gastroenterologie (ambulantní vyšetření + diagnostika)
  - Specialty 115 = gastroenterologie / endoskopie (výkony)
"""
import csv
import json
import os
from collections import defaultdict

CSV_PATH = r"C:\Users\lanto\OneDrive\Plocha\Vykony\Otevrena-data-NR-04-01-vykony.csv\Otevrena-data-NR-04-01-vykony.csv"
OUT_DIR = r"C:\Users\lanto\OneDrive\Plocha\Vykony\gastro-dashboard\public\data"

# ── SZV billing codes → official name ─────────────────────────────────────────
# Source: szv.mzcr.cz  specialty 105 (gastroenterologie) + specialty 115
# Key = SZV billing code as it appears in the CSV
GASTRO_MAP = {
    # ── Specialty 105 – Gastroenterologie (ambulantní / diagnostika) ──────────
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
    # ── Specialty 115 – Endoskopie / intervenční gastroenterologie ───────────
    # Základní endoskopie
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
    # Screening koloskopie
    "15101": "Koloskopie – okultní krvácení, neg. nález",
    "15103": "Koloskopie – okultní krvácení, poz. nález",
    "15105": "Screeningová koloskopie – neg. nález",
    "15107": "Screeningová koloskopie – poz. nález",
    # Terapeutická endoskopie
    "15900": "Endoskopická dilatace stenóz trávicí trubice",
    "15910": "Endoskopická extrakce cizího tělesa",
    "15920": "Endoskopické stavění krvácení",
    "15930": "Endoskopická laserová fotokoagulace v GIT",
    "15935": "Endoskopická fotokoagulace (argon plasma, APC)",
    "15950": "Polypektomie endoskopická",
    "15960": "Perkutánní endoskopická gastrostomie (PEG)",
    "15964": "Endoskopická vakuová terapie (EVT)",
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
    "15965": "Endoskopická nekrektomie",
}

GASTRO_CODES = set(GASTRO_MAP.keys())


def decode_age(vek_code):
    """66040044 → '40-44',  66095999 → '95+'"""
    s = str(vek_code).strip('"')
    if len(s) == 8 and s.startswith("66"):
        start = int(s[2:5])
        end_raw = int(s[5:8])
        if end_raw >= 990:
            return f"{start}+"
        return f"{start}-{end_raw}"
    return s


REGION_MAP = {
    "CZ010": "Praha",
    "CZ020": "Středočeský kraj",
    "CZ031": "Jihočeský kraj",
    "CZ032": "Plzeňský kraj",
    "CZ041": "Karlovarský kraj",
    "CZ042": "Ústecký kraj",
    "CZ051": "Liberecký kraj",
    "CZ052": "Královéhradecký kraj",
    "CZ053": "Pardubický kraj",
    "CZ063": "Kraj Vysočina",
    "CZ064": "Jihomoravský kraj",
    "CZ071": "Olomoucký kraj",
    "CZ072": "Zlínský kraj",
    "CZ080": "Moravskoslezský kraj",
}


def get_region(okres):
    o = okres.strip('"')
    for prefix, name in REGION_MAP.items():
        if o.startswith(prefix):
            return name
    return "Neznámý"


# ── Accumulators ──────────────────────────────────────────────────────────────
national  = defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0, "pocet_kontaktu": 0}))
regional  = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0, "pocet_kontaktu": 0})))
age_data  = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0})))
gender_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"mnozstvi": 0.0, "pocet_pacientu": 0})))

GENDER_LABELS = {"1": "Muži", "2": "Ženy", "9": "Neurčeno", "99": "Neurčeno"}

print("Reading CSV… (this may take a few minutes)")
total_rows = 0
gastro_rows = 0

with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        total_rows += 1
        if total_rows % 1_000_000 == 0:
            print(f"  processed {total_rows:,} rows, gastro rows: {gastro_rows:,}")

        rok, vek, pohlavi, okres, kod, mnozstvi, pocet_pac, pocet_kontaktu = row
        kod = kod.strip('"')

        if kod not in GASTRO_CODES:
            continue

        gastro_rows += 1
        rok     = rok.strip('"')
        vek     = vek.strip('"')
        pohlavi = pohlavi.strip('"')
        okres   = okres.strip('"')
        mn = float(mnozstvi)
        pp = int(pocet_pac)
        pk = int(pocet_kontaktu)

        national[kod][rok]["mnozstvi"]       += mn
        national[kod][rok]["pocet_pacientu"] += pp
        national[kod][rok]["pocet_kontaktu"] += pk

        region = get_region(okres)
        regional[kod][region][rok]["mnozstvi"]       += mn
        regional[kod][region][rok]["pocet_pacientu"] += pp
        regional[kod][region][rok]["pocet_kontaktu"] += pk

        age_label = decode_age(vek)
        age_data[kod][rok][age_label]["mnozstvi"]       += mn
        age_data[kod][rok][age_label]["pocet_pacientu"] += pp

        gender_label = GENDER_LABELS.get(pohlavi, pohlavi)
        gender_data[kod][rok][gender_label]["mnozstvi"]       += mn
        gender_data[kod][rok][gender_label]["pocet_pacientu"] += pp

print(f"\nDone. Total rows: {total_rows:,}, gastro rows: {gastro_rows:,}")

# ── Build procedure metadata list ─────────────────────────────────────────────
procedures = []
for kod in sorted(national.keys()):
    label    = GASTRO_MAP.get(kod, f"Výkon {kod}")
    total_mn = sum(v["mnozstvi"]       for v in national[kod].values())
    total_pp = sum(v["pocet_pacientu"] for v in national[kod].values())
    procedures.append({
        "kod":            kod,          # SZV billing code (same as displayed)
        "szv_code":       kod,          # kept for UI compatibility
        "label":          label,
        "total_mnozstvi": total_mn,
        "total_pacientu": total_pp,
    })

# ── Write JSON outputs ────────────────────────────────────────────────────────
os.makedirs(OUT_DIR, exist_ok=True)

def write_json(name, data):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = os.path.getsize(path) / 1024
    print(f"  wrote {name} ({size_kb:.1f} KB)")

write_json("procedures.json",    procedures)
write_json("national_trends.json",  {k: dict(v)                                         for k, v  in national.items()})
write_json("regional_data.json", {k: {r: dict(yv)  for r, yv in rv.items()}             for k, rv in regional.items()})
write_json("age_data.json",      {k: {y: dict(av)  for y, av in yv.items()}             for k, yv in age_data.items()})
write_json("gender_data.json",   {k: {y: dict(gv)  for y, gv in yv.items()}             for k, yv in gender_data.items()})

print("\nAll data files written successfully.")
