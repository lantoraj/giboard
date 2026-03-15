import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { MapPin, ExternalLink } from "lucide-react";

import { useData, getRegionalData, getRegionalTimeSeries } from "../DataContext";
import { KEY_CODES, YEARS, CHART_COLORS } from "../constants";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";
import ProcedureSelect from "../components/ProcedureSelect";

const fmt = (n) => (n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : String(Math.round(n)));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

function Sparkline({ data, color = "#3b82f6" }) {
  if (!data || data.length === 0) return <span className="text-gray-600 text-xs">—</span>;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * W,
    H - ((d.value - min) / range) * H * 0.9 - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r={2} fill={color} />
    </svg>
  );
}

export default function RegionalAnalysis() {
  const { regional } = useData();
  const [selectedKod, setSelectedKod] = useState("15430");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [metric, setMetric] = useState("mnozstvi");

  const METRIC_LABELS = {
    mnozstvi: "Objem výkonů (množství)",
    pocet_pacientu: "Počet pacientů",
    pocet_kontaktu: "Počet kontaktů",
  };

  // Bar chart – regions by selected year
  const barData = useMemo(
    () => getRegionalData(regional, selectedKod, selectedYear, metric),
    [regional, selectedKod, selectedYear, metric]
  );

  // Region trends table
  const regionSeries = useMemo(
    () => getRegionalTimeSeries(regional, selectedKod, metric),
    [regional, selectedKod, metric]
  );

  // Multi-region line chart: top 5 regions
  const top5Regions = useMemo(() => barData.slice(0, 5).map((r) => r.region), [barData]);
  const multiLineData = useMemo(() => {
    return YEARS.map((year) => {
      const row = { year };
      top5Regions.forEach((reg) => {
        row[reg] = regional[selectedKod]?.[reg]?.[year]?.[metric] ?? 0;
      });
      return row;
    });
  }, [regional, selectedKod, top5Regions, metric]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Regionální analýza</h1>
          <p className="text-sm text-gray-500 mt-0.5">Srovnání krajů ČR dle objemu výkonů</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProcedureSelect value={selectedKod} onChange={setSelectedKod} />
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none"
          >
            {Object.entries(METRIC_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info – patient residence district, not provider */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm">
        <MapPin size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-amber-200 font-medium">Data jsou dle okresu bydliště pacienta, nikoli dle sídla poskytovatele péče.</p>
          <p className="text-amber-300/70 text-xs">
            Kraj „Praha" znamená, že pacient má trvalé bydliště v Praze – výkon mohl být proveden kdekoliv v ČR.
            Pro analýzu na úrovni konkrétního poskytovatele využijte{" "}
            <a
              href="https://www.nzip.cz/data/1910-vykony-zdravotni-pece-verejne-zdravotni-pojisteni-poskytovatel-zdravotnich-sluzeb-interaktivni-vizualizace"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
            >
              data NZIP.cz – výkony dle poskytovatele
              <ExternalLink size={11} />
            </a>.
          </p>
        </div>
      </div>

      {/* Year tabs */}
      <div className="flex gap-1 flex-wrap">
        {YEARS.map((y) => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${y === selectedYear ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {y}
          </button>
        ))}
      </div>

      {/* Horizontal bar – all regions */}
      <ChartContainer title={`${METRIC_LABELS[metric]} dle kraje – ${selectedYear}`}>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 50, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis
              type="category"
              dataKey="region"
              width={200}
              interval={0}
              tick={{ fill: "#d1d5db", fontSize: 14 }}
            />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#ffffff", fontWeight: 600 }}
              itemStyle={{ color: "#fbbf24" }}
              formatter={(v) => [fmtFull(v), METRIC_LABELS[metric]]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((entry, i) => (
                <Cell key={entry.region} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Top 5 regions trend */}
      <ChartContainer title="Vývoj výkonů – Top 5 krajů" subtitle="2019–2024">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={multiLineData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} width={60} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} formatter={(v) => [fmtFull(v), ""]} />
            <Legend wrapperStyle={{ fontSize: 14, color: "#9ca3af" }} />
            {top5Regions.map((reg, i) => (
              <Line key={reg} type="monotone" dataKey={reg} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Region × Year table with sparklines */}
      <SectionHeader title="Detailní tabulka krajů" subtitle="Vývoj výkonů po rocích + sparkline trendu" />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Kraj</th>
              {YEARS.map((y) => (
                <th key={y} className="text-right px-3 py-3 text-gray-400 font-medium">{y}</th>
              ))}
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Trend</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">YoY %</th>
            </tr>
          </thead>
          <tbody>
            {regionSeries
              .map((r) => {
                const vals = YEARS.map((y) => ({ year: y, value: r[y] ?? 0 }));
                const last = vals.at(-1)?.value ?? 0;
                const prev = vals.at(-2)?.value ?? 1;
                const yoy = ((last - prev) / (prev || 1)) * 100;
                return { ...r, vals, last, yoy };
              })
              .sort((a, b) => b.last - a.last)
              .map((r, idx) => (
                <tr key={r.region} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="font-medium text-gray-200">{r.region}</span>
                  </td>
                  {YEARS.map((y) => (
                    <td key={y} className="px-3 py-3 text-right tabular-nums text-gray-300">
                      {fmtFull(r[y] ?? 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <Sparkline data={r.vals} color={CHART_COLORS[idx % CHART_COLORS.length]} />
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${r.yoy > 0 ? "text-emerald-400" : r.yoy < 0 ? "text-red-400" : "text-gray-500"}`}>
                    {`${r.yoy > 0 ? "+" : ""}${r.yoy.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
