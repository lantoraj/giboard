import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, AreaChart, Area,
} from "recharts";

import {
  useData,
  getNationalTimeSeries,
  getAgeData,
  getGenderData,
} from "../DataContext";
import { KEY_CODES, YEARS, GENDER_COLORS, CHART_COLORS } from "../constants";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";
import ProcedureSelect from "../components/ProcedureSelect";
import KpiCard from "../components/KpiCard";
import { Activity, Users, BarChart2, ExternalLink } from "lucide-react";
import { mkn10Label, mkn10Name } from "../mkn10_cs";

const fmt = (n) => (n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : String(Math.round(n)));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

export default function ProcedureDetail() {
  const { national, ageData, genderData, procedures, diagnoses, icoLoaded, icoLoading, loadIcoData } = useData();
  useEffect(() => { loadIcoData(); }, [loadIcoData]);
  const [selectedKod, setSelectedKod] = useState("15430");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [metric, setMetric] = useState("mnozstvi");

  const METRIC_LABELS = {
    mnozstvi: "Objem výkonů (množství)",
    pocet_pacientu: "Počet pacientů",
    pocet_kontaktu: "Počet kontaktů",
  };

  const proc = procedures.find((p) => p.kod === selectedKod);

  // ── Time series ─────────────────────────────────────────────────────────
  const timeSeries = useMemo(() => getNationalTimeSeries(national, selectedKod), [national, selectedKod]);

  const latestVal = timeSeries.at(-1)?.[metric] ?? 0;
  const prevVal = timeSeries.at(-2)?.[metric] ?? 1;
  const delta = ((latestVal - prevVal) / prevVal) * 100;

  const total = timeSeries.reduce((s, r) => s + (r[metric] || 0), 0);

  // ── Age breakdown ────────────────────────────────────────────────────────
  const ageRows = useMemo(() => getAgeData(ageData, selectedKod, selectedYear), [ageData, selectedKod, selectedYear]);

  // ── Gender breakdown ─────────────────────────────────────────────────────
  const genderRows = useMemo(() => getGenderData(genderData, selectedKod, selectedYear), [genderData, selectedKod, selectedYear]);
  const genderTotal = genderRows.reduce((s, r) => s + (r[metric] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Detail výkonu</h1>
          <p className="text-sm text-gray-500 mt-0.5">Podrobná analýza jednoho výkonu</p>
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

      {/* Procedure banner */}
      {proc && (
        <div className="card p-4 flex items-center gap-4 border-l-4 border-blue-500">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                {proc.kod}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{proc.label}</h2>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Posledník rok" value={fmtFull(latestVal)} subtitle={`${METRIC_LABELS[metric]} – ${timeSeries.at(-1)?.year ?? ""}`} delta={delta} deltaLabel="vs. předchozí rok" icon={Activity} color="#3b82f6" />
        <KpiCard title="Celkem 2019–2024" value={fmtFull(total)} subtitle={METRIC_LABELS[metric]} icon={BarChart2} color="#8b5cf6" />
        <KpiCard title="Průměr / rok" value={fmtFull(total / Math.max(timeSeries.length, 1))} subtitle="Průměr za sledované období" icon={Users} color="#10b981" />
      </div>

      {/* Time series area chart */}
      <ChartContainer title={`${METRIC_LABELS[metric]} – vývoj 2019–2024`}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} width={60} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
              formatter={(v) => [fmtFull(v), METRIC_LABELS[metric]]}
            />
            <ReferenceLine x="2020" stroke="#ef444455" strokeDasharray="4 4" label={{ value: "COVID-19", position: "insideTopLeft", fill: "#ef4444", fontSize: 14 }} />
            <Area type="monotone" dataKey={metric} stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 4, fill: "#3b82f6" }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Age chart */}
        <ChartContainer title={`Věkové rozložení – ${selectedYear}`} subtitle="Počet výkonů dle věkové skupiny">
          <div className="flex gap-2 mb-3 flex-wrap">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${y === selectedYear ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {y}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageRows} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="ageGroup" tick={{ fill: "#9ca3af", fontSize: 14 }} angle={-45} textAnchor="end" interval={0} />
              <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} width={55} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} formatter={(v) => [fmtFull(v), METRIC_LABELS[metric]]} />
              <Bar dataKey={metric} fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Gender pie */}
        <ChartContainer title={`Pohlaví – ${selectedYear}`} subtitle="Zastoupení mužů a žen">
          <div className="flex items-center justify-center h-64 gap-8">
            <PieChart width={200} height={200}>
              <Pie
                data={genderRows}
                dataKey={metric}
                nameKey="gender"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {genderRows.map((entry) => (
                  <Cell key={entry.gender} fill={GENDER_COLORS[entry.gender] || "#6b7280"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} formatter={(v) => [fmtFull(v), METRIC_LABELS[metric]]} />
            </PieChart>
            <div className="space-y-3">
              {genderRows.map((r) => {
                const pct = genderTotal > 0 ? ((r[metric] || 0) / genderTotal) * 100 : 0;
                return (
                  <div key={r.gender}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ background: GENDER_COLORS[r.gender] || "#6b7280" }} />
                      <span className="text-sm font-medium text-gray-200">{r.gender}</span>
                    </div>
                    <p className="text-xl font-bold text-white tabular-nums">{fmtFull(r[metric] || 0)}</p>
                    <p className="text-xs text-gray-500">{pct.toFixed(1)} %</p>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* Data table */}
      <SectionHeader title="Roční přehled" subtitle="Všechny metriky po rocích" />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400">Rok</th>
              <th className="text-right px-4 py-3 text-gray-400">Výkony</th>
              <th className="text-right px-4 py-3 text-gray-400">Pacienti</th>
              <th className="text-right px-4 py-3 text-gray-400">Kontakty</th>
              <th className="text-right px-4 py-3 text-gray-400">YoY výkony</th>
            </tr>
          </thead>
          <tbody>
            {timeSeries.map((row, i) => {
              const prev = timeSeries[i - 1];
              const yoy = prev ? ((row.mnozstvi - prev.mnozstvi) / (prev.mnozstvi || 1)) * 100 : null;
              return (
                <tr key={row.year} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-semibold text-white">{row.year}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">{fmtFull(row.mnozstvi || 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">{fmtFull(row.pocet_pacientu || 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-200">{fmtFull(row.pocet_kontaktu || 0)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${yoy === null ? "text-gray-600" : yoy > 0 ? "text-emerald-400" : yoy < 0 ? "text-red-400" : "text-gray-500"}`}>
                    {yoy !== null ? `${yoy > 0 ? "+" : ""}${yoy.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Diagnoses section (from NR-04-02) ─────────────────────────────── */}
      {icoLoaded && diagnoses[selectedKod] && (
        <>
          <SectionHeader
            title="Diagnózy (MKN-10)"
            subtitle={`Nejčastější diagnózy při výkonu ${selectedKod} · zdroj NR-04-02`}
          />
          <DiagnosisSection diagEntries={diagnoses[selectedKod]} selectedYear={selectedYear} />
        </>
      )}
      {icoLoading && (
        <p className="text-xs text-gray-600 text-center py-2">Načítám data diagnóz…</p>
      )}
    </div>
  );
}

// ── Diagnoses sub-component ───────────────────────────────────────────────────
function DiagnosisSection({ diagEntries, selectedYear }) {
  const top15 = diagEntries.slice(0, 15);

  const barData = top15.map((d) => ({
    name:  mkn10Label(d.diag),
    code:  d.diag,
    value: d.years[selectedYear]?.mn ?? 0,
  })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <ChartContainer title={`Top diagnózy – rok ${selectedYear}`}>
        <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 32)}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
            <XAxis type="number" tickFormatter={(n) => n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : n} tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis type="category" dataKey="name" width={230} tick={{ fill: "#93c5fd", fontSize: 14 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              formatter={(v, _, p) => [Math.round(v).toLocaleString("cs-CZ"), p.payload.name]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">MKN-10 kód</th>
              {YEARS.map((y) => (
                <th key={y} className="text-right px-3 py-3 text-gray-400">{y}</th>
              ))}
              <th className="text-right px-4 py-3 text-gray-400">Celkem</th>
            </tr>
          </thead>
          <tbody>
            {diagEntries.slice(0, 30).map((d) => (
              <tr key={d.diag} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5">
                  <a
                    href={`https://mkn10.uzis.cz/prohlizec/${d.diag.slice(0, 3)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 group"
                    title="Otevřít v MKN-10 prohlížeči"
                  >
                    {d.diag}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </a>
                  {mkn10Name(d.diag) !== d.diag && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight max-w-[240px]">
                      {mkn10Name(d.diag)}
                    </p>
                  )}
                </td>
                {YEARS.map((y) => (
                  <td key={y} className="px-3 py-2.5 text-right tabular-nums text-gray-300 text-xs">
                    {(d.years[y]?.mn ?? 0) > 0 ? Math.round(d.years[y].mn).toLocaleString("cs-CZ") : "—"}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-200 text-xs">
                  {d.total.toLocaleString("cs-CZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
