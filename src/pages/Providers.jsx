import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { Building2, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, ChevronsUpDown, X } from "lucide-react";

import { useData } from "../DataContext";
import { YEARS, CHART_COLORS } from "../constants";
import ProcedureSelect from "../components/ProcedureSelect";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";
import LoadingSpinner from "../components/LoadingSpinner";

const fmt     = (n) => n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : String(Math.round(n));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

function YoyBadge({ val }) {
  if (val === undefined || val === null || !isFinite(val)) return <span className="text-gray-600">—</span>;
  const Icon = val > 0 ? TrendingUp : val < 0 ? TrendingDown : Minus;
  const cls  = val > 0 ? "text-emerald-400" : val < 0 ? "text-red-400" : "text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${cls}`}>
      <Icon size={12} />
      {val > 0 ? "+" : ""}{val.toFixed(1)}%
    </span>
  );
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={11} className="text-gray-600 opacity-60" />;
  return sortDir === "desc"
    ? <ChevronDown size={11} className="text-blue-400" />
    : <ChevronUp size={11} className="text-blue-400" />;
}

export default function Providers() {
  const { providers, icoLoading, icoLoaded, loadIcoData, procedures } = useData();
  const [selectedKod, setSelectedKod]   = useState("15430");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [topN, setTopN]                 = useState(20);
  const [filterCity, setFilterCity]     = useState("");
  const [filterKraj, setFilterKraj]     = useState("");
  const [sortCol, setSortCol]           = useState(null); // null = default (selectedYear desc)
  const [sortDir, setSortDir]           = useState("desc");

  useEffect(() => { loadIcoData(); }, [loadIcoData]);

  // Reset pagination when filters/sort change
  useEffect(() => { setTopN(20); }, [filterCity, filterKraj, sortCol, sortDir, selectedKod, selectedYear]);

  // Base ranked list (by selectedYear volume desc) – used for charts + KPIs
  const ranked = useMemo(() => {
    if (!providers.length) return [];
    return providers
      .filter((p) => p.procs[selectedKod])
      .map((p) => {
        const byYear = p.procs[selectedKod] ?? {};
        const valYear = byYear[selectedYear]?.mn ?? 0;
        const valPrev = byYear[String(Number(selectedYear) - 1)]?.mn;
        const yoy = valPrev ? ((valYear - valPrev) / valPrev) * 100 : null;
        const total = Object.values(byYear).reduce((s, v) => s + (v.mn ?? 0), 0);
        return { ...p, valYear, yoy, total };
      })
      .filter((p) => p.valYear > 0)
      .sort((a, b) => b.valYear - a.valYear);
  }, [providers, selectedKod, selectedYear]);

  // Unique cities + regions for filter dropdowns (derived from full ranked list)
  const cities = useMemo(() => {
    const s = new Set(ranked.map((p) => p.city).filter(Boolean));
    return [...s].sort((a, b) => a.localeCompare(b, "cs"));
  }, [ranked]);

  const regions = useMemo(() => {
    const s = new Set(
      ranked.map((p) => p.kraj?.replace("kraj", "").replace("Kraj", "").trim()).filter(Boolean)
    );
    return [...s].sort((a, b) => a.localeCompare(b, "cs"));
  }, [ranked]);

  // Apply city / kraj filters + optional column sort
  const filtered = useMemo(() => {
    let rows = ranked;

    if (filterCity) rows = rows.filter((p) => p.city === filterCity);
    if (filterKraj) rows = rows.filter((p) => {
      const k = p.kraj?.replace("kraj", "").replace("Kraj", "").trim();
      return k === filterKraj;
    });

    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        let av, bv;
        if (sortCol === "yoy") {
          av = a.yoy ?? -Infinity;
          bv = b.yoy ?? -Infinity;
        } else {
          av = a.procs[selectedKod]?.[sortCol]?.mn ?? 0;
          bv = b.procs[selectedKod]?.[sortCol]?.mn ?? 0;
        }
        return sortDir === "desc" ? bv - av : av - bv;
      });
    }
    return rows;
  }, [ranked, filterCity, filterKraj, sortCol, sortDir, selectedKod]);

  const visible = filtered.slice(0, topN);

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  function resetFilters() {
    setFilterCity("");
    setFilterKraj("");
    setSortCol(null);
    setSortDir("desc");
  }

  // Bar chart data – top 15 from filtered set
  // Build names and deduplicate: if two providers share the same truncated name, append city
  const barData = useMemo(() => {
    const rows = filtered.slice(0, 15);
    const nameCount = {};
    rows.forEach((p) => {
      const n = p.name.length > 35 ? p.name.slice(0, 35) + "…" : p.name;
      nameCount[n] = (nameCount[n] || 0) + 1;
    });
    return rows.map((p) => {
      const base = p.name.length > 35 ? p.name.slice(0, 35) + "…" : p.name;
      const name = nameCount[base] > 1 ? `${base} (${p.city})` : base;
      return { name, value: p.valYear, ico: p.ico };
    });
  }, [filtered]);

  // Trend chart – always top 5 from full ranked (ignores filter)
  const top5 = useMemo(() => ranked.slice(0, 5), [ranked]);
  const trendData = useMemo(() =>
    YEARS.map((yr) => {
      const row = { year: yr };
      top5.forEach((p) => { row[p.ico] = p.procs[selectedKod]?.[yr]?.mn ?? 0; });
      return row;
    }), [top5, selectedKod]);

  const procLabel = procedures.find((p) => p.kod === selectedKod)?.label ?? selectedKod;
  const isFiltered = !!(filterCity || filterKraj);

  if (icoLoading) return <LoadingSpinner message="Načítám data poskytovatelů…" />;
  if (!icoLoaded)  return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Poskytovatelé</h1>
          <p className="text-sm text-gray-500 mt-0.5">Žebříček pracovišť dle objemu výkonů · NR-04-02</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ProcedureSelect value={selectedKod} onChange={setSelectedKod} />
          <div className="flex gap-1">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${y === selectedYear ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pracovišť s výkonem</p>
          <p className="text-2xl font-bold text-white">{ranked.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">rok {selectedYear}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Celkem výkonů</p>
          <p className="text-2xl font-bold text-blue-400">{fmtFull(ranked.reduce((s, p) => s + p.valYear, 0))}</p>
          <p className="text-xs text-gray-500 mt-0.5">rok {selectedYear}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Top pracoviště</p>
          <p className="text-lg font-bold text-white leading-tight truncate">{ranked[0]?.name ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{fmtFull(ranked[0]?.valYear ?? 0)} výkonů · {ranked[0]?.city}</p>
        </div>
      </div>

      {/* Bar chart top 15 */}
      <ChartContainer title={`Top 15 pracovišť – ${procLabel} – ${selectedYear}`}>
        <ResponsiveContainer width="100%" height={Math.max(420, barData.length * 38)}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 260 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis type="category" dataKey="name" width={255} interval={0} tick={{ fill: "#d1d5db", fontSize: 13 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              formatter={(v) => [fmtFull(v), "Výkony"]}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Trend top 5 */}
      {top5.length > 0 && (
        <ChartContainer title={`Vývoj – Top 5 pracovišť · ${procLabel}`} subtitle="2019–2024">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 14 }} />
              <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} width={55} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v, name) => {
                  const p = top5.find((x) => x.ico === name);
                  return [fmtFull(v), p?.name ?? name];
                }}
              />
              <Legend
                formatter={(name) => top5.find((x) => x.ico === name)?.name?.slice(0, 40) ?? name}
                wrapperStyle={{ fontSize: 14, color: "#9ca3af" }}
              />
              {top5.map((p, i) => (
                <Line key={p.ico} type="monotone" dataKey={p.ico} stroke={CHART_COLORS[i]}
                  strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* ── Table section ─────────────────────────────────────────────────── */}
      <SectionHeader
        title={`Všechna pracoviště – ${procLabel}`}
        subtitle={`Rok ${selectedYear} · ${isFiltered ? `${filtered.length} / ` : ""}${ranked.length} pracovišť`}
      />

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* City filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Město:</label>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 outline-none focus:border-gray-500 min-w-[160px]"
          >
            <option value="">Vše</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Kraj filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Kraj:</label>
          <select
            value={filterKraj}
            onChange={(e) => setFilterKraj(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 outline-none focus:border-gray-500 min-w-[160px]"
          >
            <option value="">Vše</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Reset button – only visible when something is active */}
        {(filterCity || filterKraj || sortCol) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            <X size={11} /> Resetovat
          </button>
        )}

        {isFiltered && (
          <span className="text-xs text-gray-500">
            Zobrazeno {filtered.length} z {ranked.length} pracovišť
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Pracoviště</th>
              <th className="text-left px-3 py-3 text-gray-400 font-medium">Město</th>
              <th className="text-left px-3 py-3 text-gray-400 font-medium">Kraj</th>
              <th className="text-left px-3 py-3 text-gray-400 font-medium font-mono text-xs">IČO</th>

              {/* Sortable year columns */}
              {YEARS.map((y) => (
                <th
                  key={y}
                  onClick={() => handleSort(y)}
                  className={`text-right px-3 py-3 font-medium cursor-pointer select-none transition-colors ${
                    sortCol === y ? "bg-gray-800/50 text-blue-300" : y === selectedYear ? "text-blue-400 hover:text-blue-300" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {y}
                    <SortIcon col={y} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}

              {/* Sortable YoY column */}
              <th
                onClick={() => handleSort("yoy")}
                className={`text-right px-4 py-3 font-medium cursor-pointer select-none transition-colors ${
                  sortCol === "yoy" ? "bg-gray-800/50 text-blue-300" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  YoY
                  <SortIcon col="yoy" sortCol={sortCol} sortDir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, idx) => (
              <tr key={`${p.ico}-${idx}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-gray-600 tabular-nums text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-600 flex-shrink-0" />
                    <span className="font-medium text-gray-200">{p.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-400 text-xs">{p.city}</td>
                <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {p.kraj?.replace("kraj", "").replace("Kraj", "").trim()}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-gray-600">{p.ico}</td>

                {YEARS.map((y) => (
                  <td key={y} className={`px-3 py-3 text-right tabular-nums text-xs transition-colors ${
                    sortCol === y ? "bg-gray-800/25" : ""
                  } ${y === selectedYear ? "text-gray-200 font-semibold" : "text-gray-500"}`}>
                    {fmtFull(p.procs[selectedKod]?.[y]?.mn ?? 0)}
                  </td>
                ))}

                <td className={`px-4 py-3 text-right ${sortCol === "yoy" ? "bg-gray-800/25" : ""}`}>
                  <YoyBadge val={p.yoy} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > topN && (
          <div className="px-4 py-3 border-t border-gray-800 text-center">
            <button onClick={() => setTopN((n) => n + 20)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Zobrazit dalších 20 z {filtered.length - topN} zbývajících
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
