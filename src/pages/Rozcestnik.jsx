import React, { useState } from "react";
import { ExternalLink, Database, List, Hash, Package, Building2, BarChart2, BookOpen, ChevronDown, ChevronUp, Quote } from "lucide-react";
import { useT } from "../SettingsContext";

const RESOURCES = [
  {
    icon: Database,
    title: "Národní zdravotnický informační portál",
    url: "https://www.nzip.cz/",
    description:
      "Centrální portál ÚZIS ČR s otevřenými daty, interaktivními vizualizacemi a statistikami zdravotní péče v ČR. Obsahuje mj. data o výkonech dle poskytovatele zdravotních služeb.",
    tag: "ÚZIS ČR",
    tagColor: "blue",
  },
  {
    icon: List,
    title: "Seznam zdravotních výkonů",
    url: "https://szv.mzcr.cz/Vykon?cols=Odbornost%2CCisloVykonu%2CNazevVykonu%2CKategorie%2CTypVykonu%2CDobaTrvani%2COmezeniMistem%2COmezeniFrekvenci%2CPrimeNaklady%2COsobni%2CBodyRezijni%2CBodyCelkem%2CRevize%2CDetail",
    description:
      "Úplný seznam výkonů Seznamu zdravotních výkonů s bodovými hodnotami (SZV) dle vyhlášky MZ ČR. Obsahuje kódy, názvy, omezení, dobu trvání a bodové ohodnocení výkonů.",
    tag: "SZV · MZ ČR",
    tagColor: "green",
  },
  {
    icon: Hash,
    title: "Číselníky SZV",
    url: "https://szv.mzcr.cz/Ciselnik/",
    description:
      "Číselníky odborností, diagnóz, ZUM/ZULP a dalších kódů používaných v Seznamu zdravotních výkonů a ve vykazování zdravotní péče pojišťovnám.",
    tag: "SZV · MZ ČR",
    tagColor: "green",
  },
  {
    icon: Package,
    title: "Zdravotnické prostředky (VZP)",
    url: "https://www.vzp.cz/poskytovatele/ciselniky/zdravotnicke-prostredky",
    description:
      "Číselník zdravotnických prostředků VZP ČR – seznam hrazených prostředků, kódů ZP, limitů úhrady a podmínek pro vykazování.",
    tag: "VZP ČR",
    tagColor: "purple",
  },
  {
    icon: Building2,
    title: "Národní registr poskytovatelů zdravotních služeb",
    url: "https://nrpzs.uzis.cz/index.php?pg=home--download",
    description:
      "Otevřená data Národního registru poskytovatelů zdravotních služeb (NRPZS) – ke stažení ve formátu CSV/XML. Obsahuje seznam všech oprávněných poskytovatelů zdravotních služeb v ČR včetně oborů péče, adres a IČO.",
    tag: "ÚZIS ČR",
    tagColor: "blue",
  },
  {
    icon: BarChart2,
    title: "Ústav zdravotnických informací a statistiky ČR",
    url: "https://www.uzis.cz/index.php",
    description:
      "Hlavní stránka ÚZIS ČR – správce národních zdravotnických registrů, vydavatel zdravotnické statistiky a otevřených dat. Zdroj datových sad NR-04 (výkony, diagnózy, poskytovatelé) použitých v tomto dashboardu.",
    tag: "ÚZIS ČR",
    tagColor: "blue",
  },
];

const DATASETS = [
  {
    title: "Výkony zdravotní péče vykázané v rámci veřejného zdravotního pojištění",
    url: "https://www.nzip.cz/data/1744-vykony-zdravotni-pece-verejne-zdravotni-pojisteni-otevrena-data",
    description:
      "Otevřená data NR-04-01 – výkony zdravotní péče dle kódu výkonu, roku, věku, pohlaví a okresu bydliště pacienta. Zdrojová datová sada pro celkové objemy, věkové a regionální analýzy v tomto dashboardu.",
    citation:
      "Kyseľová A., Benešová K., Jarkovský J., Klika P., Šanca O., Klimeš D., Mužík J., Komenda M., Dušek L. Výkony zdravotní péče vykázané v rámci veřejného zdravotního pojištění. Národní zdravotnický informační portál [online]. Praha: Ministerstvo zdravotnictví ČR a Ústav zdravotnických informací a statistiky ČR, 2023 [cit. 2026-03-15]. Dostupné z: http://www.nzip.cz/data/1744-vykony-zdravotni-pece-verejne-zdravotni-pojisteni-otevrena-data. ISSN 2695-0340",
    tag: "NR-04-01",
  },
  {
    title: "Výkony zdravotní péče vykázané v rámci veřejného zdravotního pojištění u jednotlivých poskytovatelů zdravotních služeb včetně hlavní diagnózy",
    url: "https://www.nzip.cz/data/1745-vykony-zdravotni-pece-verejne-zdravotni-pojisteni-poskytovatel-zdravotnich-sluzeb-otevrena-data",
    description:
      "Otevřená data NR-04-02 – výkony zdravotní péče dle kódu výkonu, roku, IČO poskytovatele a hlavní diagnózy (MKN-10). Zdrojová datová sada pro analýzy poskytovatelů a diagnóz v tomto dashboardu.",
    citation:
      "Kyseľová A., Benešová K., Jarkovský J., Klika P., Šanca O., Klimeš D., Mužík J., Komenda M., Dušek L. Výkony zdravotní péče vykázané v rámci veřejného zdravotního pojištění u jednotlivých poskytovatelů zdravotních služeb včetně hlavní diagnózy. Národní zdravotnický informační portál [online]. Praha: Ministerstvo zdravotnictví ČR a Ústav zdravotnických informací a statistiky ČR, 2023 [cit. 2026-03-15]. Dostupné z: http://www.nzip.cz/data/1745-vykony-zdravotni-pece-verejne-zdravotni-pojisteni-poskytovatel-zdravotnich-sluzeb-otevrena-data. ISSN 2695-0340",
    tag: "NR-04-02",
  },
];

const TAG_COLORS = {
  blue:   "bg-blue-900/30 text-blue-300 border border-blue-700/40",
  green:  "bg-emerald-900/30 text-emerald-300 border border-emerald-700/40",
  purple: "bg-purple-900/30 text-purple-300 border border-purple-700/40",
};

function DatasetCard({ title, url, description, citation, tag }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-emerald-400" />
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 whitespace-nowrap">
            {tag}
          </span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 mt-0.5 text-gray-600 hover:text-gray-300 transition-colors"
          title={t("Otevřít datovou sadu")}
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Title + description */}
      <div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-100 hover:text-strong transition-colors leading-snug"
        >
          {t(title)}
        </a>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t(description)}</p>
      </div>

      {/* Citation toggle */}
      <div className="border-t border-gray-800 pt-2.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Quote size={11} />
          {t("Citace")}
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        {open && (
          <p className="mt-2 text-[11px] text-gray-500 leading-relaxed font-mono bg-gray-800/50 rounded-lg px-3 py-2.5 border border-gray-700/50 select-all">
            {citation}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Rozcestnik() {
  const t = useT();
  return (
    <div className="space-y-8">

      {/* ── Section 1: Resources ──────────────────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-strong">{t("Rozcestník")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("Užitečné zdroje a registry ke zdravotním výkonům v ČR")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {RESOURCES.map(({ icon: Icon, title, url, description, tag, tagColor }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-5 flex flex-col gap-3 hover:border-gray-600 hover:bg-gray-800/60 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-700/60 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors">
                    <Icon size={18} className="text-gray-300" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[tagColor]}`}>
                    {tag}
                  </span>
                </div>
                <ExternalLink size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0 mt-1" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-100 group-hover:text-strong transition-colors leading-snug">
                  {t(title)}
                </h2>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t(description)}</p>
              </div>
              <p className="text-[11px] text-gray-600 group-hover:text-gray-500 font-mono truncate transition-colors mt-auto pt-1 border-t border-gray-800">
                {url.length > 60 ? url.slice(0, 60) + "…" : url}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">{t("datové sady")}</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* ── Section 2: Datasets ──────────────────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-strong">{t("Datové sady – časové pokrytí: 1. 1. 2019 – 31. 12. 2024")}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t("Zdrojová otevřená data NZIP · ÚZIS ČR použitá v tomto dashboardu")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {DATASETS.map((ds) => (
            <DatasetCard key={ds.url} {...ds} />
          ))}
        </div>
      </div>

    </div>
  );
}
