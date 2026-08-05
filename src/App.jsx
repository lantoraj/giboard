import React, { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Activity, Map, GitCompare, Search, ChevronLeft, ChevronRight, ChevronDown, Check, AlertCircle, Compass, Building2, ChartNoAxesCombined, Stethoscope, Bell, Settings, Layers } from "lucide-react";

import { DataProvider, useData } from "./DataContext";
import { SettingsProvider, useSettings, useT } from "./SettingsContext";
import { SPECIALTIES, getSpec } from "./constants";
import LoadingSpinner from "./components/LoadingSpinner";
import Overview from "./pages/Overview";
import ProcedureDetail from "./pages/ProcedureDetail";
import RegionalAnalysis from "./pages/RegionalAnalysis";
import Comparison from "./pages/Comparison";
import Explorer from "./pages/Explorer";
import Rozcestnik from "./pages/Rozcestnik";
import Providers from "./pages/Providers";
import DiagAnalysis from "./pages/DiagAnalysis";
import SettingsPage from "./pages/Settings";
import Drg from "./pages/Drg";

const NAV = [
  { id: "overview",    label: "Přehled",            icon: LayoutDashboard },
  { id: "detail",      label: "Detail výkonu",      icon: Activity },
  { id: "providers",   label: "Poskytovatelé",      icon: Building2 },
  { id: "regional",    label: "Regionální analýza", icon: Map },
  { id: "diagnoses",   label: "MKN-10",             icon: Stethoscope },
  { id: "comparison",  label: "Srovnání",           icon: GitCompare },
  { id: "explorer",    label: "Průzkumník",         icon: Search },
  { id: "rozcestnik",  label: "Rozcestník",         icon: Compass },
  { separator: true },
  { id: "drg",         label: "CZ-DRG",             icon: Layers },
  { separator: true },
  { id: "upozorneni",  label: "Upozornění",         icon: Bell },
  { id: "nastaveni",   label: "Nastavení",          icon: Settings },
];

function SpecialtySwitcher({ collapsed }) {
  const { spec, setSpec, t } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = getSpec(spec);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (id) => { setSpec(id); setOpen(false); };

  return (
    <div ref={ref} className={`relative pt-3 ${collapsed ? "px-2" : "px-3"}`}>
      {!collapsed && (
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 px-1">{t("Odbornost")}</p>
      )}

      {/* Trigger – shows the active specialty */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? t(active.short) : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          open
            ? "bg-gray-800 text-gray-100 border-gray-600"
            : "bg-gray-800/60 text-gray-200 border-gray-700 hover:border-gray-500"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active.color }} />
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left">{t(active.short)}</span>
            <ChevronDown size={13} className={`flex-shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden py-1 ${
            collapsed ? "left-full ml-2 top-3 w-52" : "left-3 right-3"
          }`}
        >
          {SPECIALTIES.map((s) => (
            <button
              key={s.id}
              role="option"
              aria-selected={spec === s.id}
              onClick={() => choose(s.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium transition-colors ${
                spec === s.id ? "bg-gray-800 text-gray-100" : "text-gray-400 hover:bg-gray-800/70 hover:text-gray-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="truncate flex-1 text-left">{t(s.short)}</span>
              {spec === s.id && <Check size={12} className="flex-shrink-0 text-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpecialtyLanding() {
  const { setSpec, t } = useSettings();
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <ChartNoAxesCombined size={20} className="text-white" />
        </div>
        <p className="text-3xl font-bold text-strong tracking-wide">GI-Board</p>
      </div>
      <p className="text-sm text-gray-500 mb-10">{t("Analytický dashboard zdravotních výkonů · NRHZS · ÚZIS ČR · 2019–2024")}</p>

      <h1 className="text-xl font-semibold text-gray-100 mb-6">{t("Vyberte odbornost")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        {SPECIALTIES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSpec(s.id)}
            className="card p-6 text-left hover:border-gray-500 transition-all group flex flex-col gap-3"
          >
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}22` }}>
              <span className="w-3.5 h-3.5 rounded-full" style={{ background: s.color }} />
            </span>
            <span className="text-base font-semibold text-gray-100 group-hover:text-strong leading-snug">{t(s.label)}</span>
            <span className="text-xs text-gray-500 leading-relaxed">{t(s.description)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-8">{t("Odbornost lze kdykoli přepnout v levém panelu.")}</p>
    </div>
  );
}

function Sidebar({ active, onNavigate, collapsed, onToggle }) {
  const t = useT();
  return (
    <aside className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${collapsed ? "w-16" : "w-56"} min-h-screen flex-shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-800 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <ChartNoAxesCombined size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-2xl font-bold text-strong leading-tight tracking-wide">GI-Board</p>
            <p className="text-[10px] text-gray-500 leading-tight">NRHZS · ČR</p>
          </div>
        )}
      </div>

      {/* Specialty switcher */}
      <SpecialtySwitcher collapsed={collapsed} />
      <hr className="border-gray-700/70 mx-3 mt-3" />

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 flex flex-col">
        {(() => {
          const sections = [[]];
          NAV.forEach(item => {
            if (item.separator) sections.push([]);
            else sections[sections.length - 1].push(item);
          });
          const renderBtn = (item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? t(item.label) : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active === item.id
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{t(item.label)}</span>}
            </button>
          );
          return sections.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && <hr className="border-gray-700/70 mx-1 mt-5 mb-4" />}
              <div className="space-y-0.5">{group.map(renderBtn)}</div>
            </React.Fragment>
          ));
        })()}

        {/* Divider + Data badge */}
        <hr className="border-gray-700/70 mt-3 mb-2 mx-1" />
        {!collapsed && (
          <div className="mx-1 px-3 py-2.5 bg-gray-800/60 rounded-lg border border-gray-700">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t("Zdroj dat")}</p>
            <p className="text-xs text-gray-300 font-medium">NRHZS · ÚZIS ČR</p>
            <p className="text-[10px] text-gray-500 mt-0.5">2019 – 2024</p>
          </div>
        )}
      </nav>

      {/* Toggle */}
      <button onClick={onToggle}
        className="mx-2 mb-3 flex items-center justify-center py-2 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors">
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="text-xs ml-1">{t("Sbalit")}</span></>}
      </button>
    </aside>
  );
}

function DataErrorBanner({ error }) {
  const t = useT();
  return (
    <div className="m-6 p-4 bg-red-900/30 border border-red-700 rounded-xl flex items-start gap-3">
      <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-300">{t("Data se nepodařilo načíst")}</p>
        <p className="text-xs text-red-400 mt-0.5">{error}</p>
        <p className="text-xs text-gray-500 mt-2">{t("Ujistěte se, že jste spustili")} <code className="text-blue-400">data_prep/extract.py</code> {t("a JSON soubory jsou v")} <code className="text-blue-400">public/data/</code>.</p>
      </div>
    </div>
  );
}

function UpozorneniPage() {
  const t = useT();
  return (
    <div className="max-w-2xl mx-auto py-10 px-2">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
          <Bell size={18} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-100">{t("Upozornění")}</h1>
          <p className="text-sm text-gray-500">{t("Důležité informace o aplikaci a datech")}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Disclaimer card */}
        <div className="rounded-xl border border-yellow-600/30 bg-yellow-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-300 mb-2">{t("Vzdělávací účel")}</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t("Tato aplikace a veškerý její obsah slouží")}{" "}
                <span className="text-strong font-medium">{t("výhradně pro edukační a informační účely")}</span>.{" "}
                {t("Autor nenese žádnou odpovědnost za způsob využití zde uvedených dat, jejich interpretaci ani za jakákoli rozhodnutí učiněná na jejich základě.")}
              </p>
            </div>
          </div>
        </div>

        {/* Data accuracy card */}
        <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-200 mb-2">{t("Přesnost dat")}</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t("Zobrazená data vycházejí z Národního registru hrazených zdravotních služeb (NRHZS) zveřejněného ÚZIS ČR. Data")}{" "}
                <span className="text-gray-300">{t("mohou obsahovat nepřesnosti nebo neúplné záznamy")}</span>{" "}
                {t("vzniklé při jejich sběru, zpracování nebo agregaci. Pro oficiální a závazné informace navštivte zdroj dat přímo na")}{" "}
                <span className="text-blue-400">nzip.cz</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Source info */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/20 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">{t("Zdroj dat")}</p>
          <div className="space-y-1.5 text-sm text-gray-400">
            <p><span className="text-gray-300 font-medium">{t("Registr:")}</span> {t("Národní registr hrazených zdravotních služeb (NRHZS)")}</p>
            <p><span className="text-gray-300 font-medium">{t("Správce:")}</span> ÚZIS ČR</p>
            <p><span className="text-gray-300 font-medium">{t("Datová sada:")}</span> {t("NR-04-01 (národní), NR-04-02 (IČO)")}</p>
            <p><span className="text-gray-300 font-medium">{t("Období:")}</span> 2019 – 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGES = {
  overview:    Overview,
  detail:      ProcedureDetail,
  regional:    RegionalAnalysis,
  comparison:  Comparison,
  explorer:    Explorer,
  providers:   Providers,
  diagnoses:   DiagAnalysis,
  rozcestnik:  Rozcestnik,
  drg:         Drg,
  upozorneni:  UpozorneniPage,
  nastaveni:   SettingsPage,
};

function AppContent() {
  const { loading, error } = useData();
  const { spec } = useSettings();
  const t = useT();
  const [page, setPage] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  if (!spec) return <SpecialtyLanding />;

  const Page = PAGES[page];

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar active={page} onNavigate={setPage} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* key={spec} remounts specialty pages so their defaults reset; DRG is
              specialty-independent and keeps its own state across switches */}
          {page === "drg"
            ? <Page />
            : loading ? <LoadingSpinner message={t("Načítám data výkonů…")} />
            : error ? <DataErrorBanner error={error} />
            : <Page key={spec} />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </SettingsProvider>
  );
}
