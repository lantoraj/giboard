# -*- coding: utf-8 -*-
"""
Parse the VZP "Číselník VYKONY" PDF into a code -> {odbornost, nazev} JSON.

Why this exists: NR-04-01/02 contain ~1250 codes with prefixes 07/90/91 that are
NOT in the SZV číselník (Vykony_definice.xlsx). Those are the "(DRG)" marker
codes – e.g. 90915 Sleeve gastrektomie, 90914 Gastrický bypass. The dataset
metadata states codes follow "číselník MZČR, popř. číselníku zdravotních
pojišťoven (např. VZP)", and the VZP list is where their names live.

The PDF is a ruled table, so cells are extracted from the drawn borders
(vertical/horizontal edges) rather than from flowed text – names wrap across
several visual lines and text-only extraction interleaves them wrongly.

Output: data_prep/vzp_ciselnik.json   { "90915": {"odb": "501", "nazev": "..."} }
"""
import io, json, re, sys
from pathlib import Path

import pdfplumber

sys.stdout.reconfigure(encoding="utf-8")

PDF = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\lanto\AppData\Local\Temp\claude\C--Users-lanto-OneDrive-Plocha-Vykony"
    r"\76ed996e-92c6-4cff-b418-31e19375d18a\scratchpad\vzp.pdf")
OUT = Path(__file__).resolve().parent / "vzp_ciselnik.json"

TABLE = {"vertical_strategy": "lines", "horizontal_strategy": "lines",
         "intersection_tolerance": 5}
CODE_RE = re.compile(r"^\d{5}$")

def clean(s):
    """Collapse the newlines the PDF inserts inside wrapped cells."""
    return " ".join((s or "").split())

def main():
    codes = {}
    with pdfplumber.open(PDF) as pdf:
        total = len(pdf.pages)
        for pi, page in enumerate(pdf.pages):
            table = page.extract_table(TABLE)
            if not table:
                continue
            for row in table:
                if len(row) < 4:
                    continue
                kod = clean(row[0])
                if not CODE_RE.match(kod):
                    continue          # header / title / continuation rows
                nazev = clean(row[3])
                if not nazev:
                    continue
                # keep the first occurrence; the list is sorted by code
                codes.setdefault(kod, {"odb": clean(row[1]), "nazev": nazev})
            if (pi + 1) % 50 == 0:
                print(f"  strana {pi+1}/{total}, kodu: {len(codes)}", flush=True)

    with io.open(OUT, "w", encoding="utf-8") as f:
        json.dump(codes, f, ensure_ascii=False, indent=0, sort_keys=True)

    by_prefix = {}
    for k in codes:
        by_prefix[k[:2]] = by_prefix.get(k[:2], 0) + 1
    print(f"\nCelkem {len(codes)} kodu -> {OUT.name}")
    print("DRG markery:", {p: by_prefix.get(p, 0) for p in ("07", "90", "91")})
    for probe in ("90914", "90915", "90854", "15050", "07000"):
        rec = codes.get(probe)
        print(f"  {probe}: {rec['odb'] + ' | ' + rec['nazev'][:62] if rec else 'NENALEZEN'}")

if __name__ == "__main__":
    main()
