import React, { useMemo, useState, useRef, useEffect } from "react";
import { Search, ArrowUpDown, TrendingUp, TrendingDown, Minus, Building2, BarChart2, X } from "lucide-react";
import { useData, getNationalTimeSeries } from "../DataContext";
import { useT } from "../SettingsContext";
import { YEARS, CHART_COLORS } from "../constants";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : n > 0 ? String(Math.round(n)) : "—");

function MiniSparkline({ series, color }) {
  const hasData = series.some((s) => (s.mnozstvi ?? 0) > 0);
  if (!hasData) return <span className="text-gray-700 text-xs px-5">—</span>;
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={series}>
        <Line type="monotone" dataKey="mnozstvi" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Strip diacritics for fuzzy matching (handles composed vs. decomposed unicode)
const norm = (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ── Provider search dropdown ────────────────────────────────────────────────
function ProviderSearch({ providers, selected, onSelect }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return providers.slice(0, 30);
    const q = norm(query);
    return providers
      .filter((p) => norm(p.name).includes(q) || p.ico.includes(q) || norm(p.city).includes(q) || norm(p.kraj).includes(q))
      .slice(0, 40);
  }, [providers, query]);

  const handleSelect = (p) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-600/40 rounded-lg">
          <Building2 size={14} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-300 font-medium truncate">{selected.name}</p>
            <p className="text-[10px] text-blue-500">{selected.city} · IČO {selected.ico}</p>
          </div>
          <button onClick={handleClear} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
          <Building2 size={14} className="text-gray-500" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="bg-transparent text-sm text-gray-200 outline-none flex-1 placeholder-gray-600"
            placeholder={t("Hledat pracoviště (název nebo IČO)…")}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {open && !selected && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">{t("Žádné výsledky")}</p>
          ) : (
            results.map((p, i) => (
              <button
                key={`${p.ico}-${i}`}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0"
              >
                <p className="text-sm text-gray-200 font-medium">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.city} · {p.kraj} · IČO {p.ico}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Explorer() {
  const { procedures, national, providers, gastroRegistry, icoLoaded, icoLoading, loadIcoData } = useData();
  const t = useT();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState("national"); // "national" | "provider"
  const [selectedProvider, setSelectedProvider] = useState(null);
  const PAGE_SIZE = 25;

  // Load ICO data when switching to provider mode
  useEffect(() => {
    if (viewMode === "provider" && !icoLoaded && !icoLoading) {
      loadIcoData();
    }
  }, [viewMode, icoLoaded, icoLoading, loadIcoData]);

  // Build enriched rows – national mode
  const enrichedNational = useMemo(() => {
    return procedures.map((p, idx) => {
      const series = getNationalTimeSeries(national, p.kod);
      const last = series.at(-1)?.mnozstvi ?? 0;
      const prev = series.at(-2)?.mnozstvi ?? 0;
      const yoy = prev > 0 ? ((last - prev) / prev) * 100 : null;
      const total = series.reduce((s, r) => s + (r.mnozstvi || 0), 0);
      return { ...p, series, last, yoy, total, color: CHART_COLORS[idx % CHART_COLORS.length] };
    });
  }, [procedures, national]);

  // Find matching providers_data entry by ICO for selected registry provider
  const selectedProviderData = useMemo(() => {
    if (!selectedProvider) return null;
    return providers.find((p) => p.ico === selectedProvider.ico) ?? null;
  }, [selectedProvider, providers]);

  // Build enriched rows – provider mode
  const enrichedProvider = useMemo(() => {
    if (!selectedProvider) return [];
    const procs = selectedProviderData?.procs ?? {};
    return procedures.map((p, idx) => {
      const kodData = procs[p.kod] ?? {};
      const series = YEARS.map((y) => ({ year: String(y), mnozstvi: kodData[String(y)]?.mn ?? 0 }));
      const last = series.at(-1)?.mnozstvi ?? 0;
      const prev = series.at(-2)?.mnozstvi ?? 0;
      const yoy = prev > 0 ? ((last - prev) / prev) * 100 : null;
      const total = series.reduce((s, r) => s + (r.mnozstvi || 0), 0);
      return { ...p, series, last, yoy, total, color: CHART_COLORS[idx % CHART_COLORS.length] };
    });
  }, [procedures, selectedProvider, selectedProviderData]);

  const enriched = viewMode === "provider" ? enrichedProvider : enrichedNational;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return enriched
      .filter((p) => {
        const matchesSearch = p.label.toLowerCase().includes(q) || p.kod.includes(q) || (p.szv_code && p.szv_code.includes(q));
        return matchesSearch;
      })
      .sort((a, b) => {
        const va = sortKey === "total" ? a.total : sortKey === "last" ? a.last : sortKey === "yoy" ? (a.yoy ?? -Infinity) : a.kod;
        const vb = sortKey === "total" ? b.total : sortKey === "last" ? b.last : sortKey === "yoy" ? (b.yoy ?? -Infinity) : b.kod;
        if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === "asc" ? va - vb : vb - va;
      });
  }, [enriched, query, sortKey, sortDir]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  };

  const SortBtn = ({ k, label }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors font-medium">
      {label} <ArrowUpDown size={12} className={sortKey === k ? "text-blue-400" : ""} />
    </button>
  );

  const switchMode = (mode) => {
    setViewMode(mode);
    setPage(0);
    setSortKey("total");
    setSortDir("desc");
  };

  // Stats for selected provider
  const providerTotal = useMemo(() => {
    if (!selectedProvider) return null;
    return enrichedProvider.reduce((s, p) => s + p.total, 0);
  }, [enrichedProvider, selectedProvider]);

  const providerActiveProcs = useMemo(() => {
    if (!selectedProvider) return null;
    return enrichedProvider.filter((p) => p.total > 0).length;
  }, [enrichedProvider, selectedProvider]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-strong">{t("Průzkumník výkonů")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("Všechny GIT výkony – vyhledávání a řazení")}</p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => switchMode("national")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "national" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <BarChart2 size={14} /> {t("Národní přehled")}
          </button>
          <button
            onClick={() => switchMode("provider")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "provider" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Building2 size={14} /> {t("Podle pracoviště")}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Text search */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg w-72">
          <Search size={15} className="text-gray-500" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            className="bg-transparent text-sm text-gray-200 outline-none flex-1 placeholder-gray-600"
            placeholder={t("Hledat kód nebo název…")} />
          {query && <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300"><X size={13} /></button>}
        </div>

        {/* Provider picker – only in provider mode */}
        {viewMode === "provider" && (
          icoLoading ? (
            <p className="text-sm text-gray-500 animate-pulse">{t("Načítám data pracovišť…")}</p>
          ) : (
            <ProviderSearch
              providers={gastroRegistry}
              selected={selectedProvider}
              onSelect={(p) => { setSelectedProvider(p); setPage(0); setSortKey("total"); setSortDir("desc"); }}
            />
          )
        )}
      </div>

      {/* Provider summary KPIs */}
      {viewMode === "provider" && selectedProvider && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t("Pracoviště")}</p>
            <p className="text-sm font-semibold text-strong leading-snug">{selectedProvider.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{selectedProvider.city} · {selectedProvider.kraj}</p>
            <p className="text-[10px] text-gray-600 mt-1 capitalize">{selectedProvider.obor}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">IČO</p>
            <p className="text-lg font-bold text-blue-400 font-mono">{selectedProvider.ico}</p>
            {selectedProviderData
              ? <p className="text-[10px] text-emerald-500 mt-1">✓ {t("Data výkonů dostupná")}</p>
              : <p className="text-[10px] text-gray-600 mt-1">{t("Žádná data výkonů (2019–2024)")}</p>
            }
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t("Celkem výkonů (2019–2024)")}</p>
            <p className="text-lg font-bold text-strong">{providerTotal > 0 ? fmt(providerTotal) : "—"}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t("Aktivní kódy")}</p>
            <p className="text-lg font-bold text-strong">
              {providerActiveProcs > 0 ? providerActiveProcs : "—"}
              {providerActiveProcs > 0 && <span className="text-sm text-gray-500 font-normal"> / {procedures.length}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Provider mode – no provider selected placeholder */}
      {viewMode === "provider" && !selectedProvider && !icoLoading && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-600">
          <Building2 size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">{t("Vyberte pracoviště")}</p>
          <p className="text-xs mt-1 opacity-70">
            {t("Vyhledejte z {n} gastroenterologických pracovišť v ČR", { n: gastroRegistry.length })}
          </p>
        </div>
      )}

      {/* Table */}
      {(viewMode === "national" || (viewMode === "provider" && selectedProvider)) && (
        <>
          <p className="text-xs text-gray-500">
            {filtered.filter((p) => viewMode === "provider" ? p.total > 0 : true).length !== filtered.length
              ? t("{n} výkonů · {m} s daty", { n: filtered.length, m: filtered.filter(p => p.total > 0).length })
              : t("{n} výkonů celkem", { n: filtered.length })}
          </p>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3"><SortBtn k="kod" label={t("SZV kód")} /></th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Název")}</th>
                  {YEARS.map((y) => (
                    <th key={y} className="text-right px-3 py-3 text-gray-400 font-medium">{y}</th>
                  ))}
                  <th className="text-right px-4 py-3"><SortBtn k="total" label={t("Celkem")} /></th>
                  <th className="text-right px-4 py-3"><SortBtn k="yoy" label="YoY %" /></th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">{t("Trend")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const seriesMap = Object.fromEntries(p.series.map((s) => [s.year, s.mnozstvi]));
                  const hasAnyData = p.total > 0;
                  return (
                    <tr key={p.kod}
                      className={`border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors ${
                        viewMode === "provider" && !hasAnyData ? "opacity-35" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-400 whitespace-nowrap">{p.kod}</td>
                      <td className="px-4 py-2.5 text-gray-200 max-w-[220px]">
                        <span className="leading-tight">{p.label}</span>
                      </td>
                      {YEARS.map((y) => (
                        <td key={y} className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">
                          {seriesMap[String(y)] > 0 ? fmt(seriesMap[String(y)]) : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-200">
                        {hasAnyData ? fmt(p.total) : "—"}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold text-xs ${
                        p.yoy === null || !hasAnyData ? "text-gray-600" : p.yoy > 0 ? "text-emerald-400" : p.yoy < 0 ? "text-red-400" : "text-gray-500"
                      }`}>
                        <span className="flex items-center justify-end gap-1">
                          {p.yoy === null || !hasAnyData ? "—" : (
                            <>{p.yoy > 0 ? <TrendingUp size={11} /> : p.yoy < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                            {p.yoy > 0 ? "+" : ""}{p.yoy.toFixed(1)}%</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <MiniSparkline series={p.series} color={p.color} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-800">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
                  {t("← Předchozí")}
                </button>
                <span className="text-sm text-gray-500">{page + 1} / {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                  className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
                  {t("Další →")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
