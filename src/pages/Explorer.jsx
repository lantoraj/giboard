import React, { useMemo, useState } from "react";
import { Search, ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useData, getNationalTimeSeries } from "../DataContext";
import { YEARS, CHART_COLORS } from "../constants";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : String(Math.round(n)));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

function MiniSparkline({ series, color }) {
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={series}>
        <Line type="monotone" dataKey="mnozstvi" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Explorer() {
  const { procedures, national } = useData();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("total");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const enriched = useMemo(() => {
    return procedures.map((p, idx) => {
      const series = getNationalTimeSeries(national, p.kod);
      const last = series.at(-1)?.mnozstvi ?? 0;
      const prev = series.at(-2)?.mnozstvi ?? 0;
      const yoy = prev > 0 ? ((last - prev) / prev) * 100 : null;
      const total = series.reduce((s, r) => s + (r.mnozstvi || 0), 0);
      return { ...p, series, last, yoy, total, color: CHART_COLORS[idx % CHART_COLORS.length] };
    });
  }, [procedures, national]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return enriched
      .filter((p) => p.label.toLowerCase().includes(q) || p.kod.includes(q) || (p.szv_code && p.szv_code.includes(q)))
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Průzkumník výkonů</h1>
          <p className="text-sm text-gray-500 mt-0.5">Všechny GIT výkony – vyhledávání a řazení</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg w-72">
          <Search size={15} className="text-gray-500" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            className="bg-transparent text-sm text-gray-200 outline-none flex-1 placeholder-gray-600"
            placeholder="Hledat kód nebo název…" />
        </div>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} výkonů celkem</p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3"><SortBtn k="kod" label="SZV kód" /></th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Název</th>
              {YEARS.map((y) => (
                <th key={y} className="text-right px-3 py-3 text-gray-400 font-medium">{y}</th>
              ))}
              <th className="text-right px-4 py-3"><SortBtn k="total" label="Celkem" /></th>
              <th className="text-right px-4 py-3"><SortBtn k="yoy" label="YoY %" /></th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const seriesMap = Object.fromEntries(p.series.map((s) => [s.year, s.mnozstvi]));
              return (
                <tr key={p.kod} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-400 whitespace-nowrap">
                    <span>{p.kod}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-200 max-w-[220px]">
                    <span className="leading-tight">{p.label}</span>
                  </td>
                  {YEARS.map((y) => (
                    <td key={y} className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">
                      {fmt(seriesMap[y] ?? 0)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-200">{fmt(p.total)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold text-xs ${p.yoy === null ? "text-gray-600" : p.yoy > 0 ? "text-emerald-400" : p.yoy < 0 ? "text-red-400" : "text-gray-500"}`}>
                    <span className="flex items-center justify-end gap-1">
                      {p.yoy === null ? "—" : <>{p.yoy > 0 ? <TrendingUp size={11} /> : p.yoy < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}{p.yoy > 0 ? "+" : ""}{p.yoy.toFixed(1)}%</>}
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
              ← Předchozí
            </button>
            <span className="text-sm text-gray-500">{page + 1} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
              Další →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
