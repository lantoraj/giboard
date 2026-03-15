import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

import { useData, getMultiCodeTimeSeries, getNationalTimeSeries } from "../DataContext";
import { KEY_CODES, YEARS, CHART_COLORS } from "../constants";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";
import ProcedureSelect from "../components/ProcedureSelect";

const fmt = (n) => (n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : String(Math.round(n)));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

// Index series to 100 at base year for normalised growth chart
function indexSeries(timeSeries, kod, baseYear = "2019") {
  const base = timeSeries.find((r) => r.year === baseYear)?.[kod] || 1;
  return timeSeries.map((r) => ({ ...r, [kod]: ((r[kod] || 0) / base) * 100 }));
}

export default function Comparison() {
  const { national, procedures } = useData();

  const [selectedCodes, setSelectedCodes] = useState(["15430", "15410", "15024", "15404"]);
  const [metric, setMetric] = useState("mnozstvi");
  const [baseYear, setBaseYear] = useState("2019");

  const METRIC_LABELS = { mnozstvi: "Objem výkonů (množství)", pocet_pacientu: "Počet pacientů", pocet_kontaktu: "Počet kontaktů" };

  const multiSeries = useMemo(
    () => getMultiCodeTimeSeries(national, selectedCodes, metric),
    [national, selectedCodes, metric]
  );

  // Indexed (normalised to 100) series
  const indexedSeries = useMemo(() => {
    let s = [...multiSeries];
    selectedCodes.forEach((kod) => { s = indexSeries(s, kod, baseYear); });
    return s;
  }, [multiSeries, selectedCodes, baseYear]);

  // Radar chart: each code's value in latest year relative to their own max
  const radarData = useMemo(() => {
    if (!selectedCodes.length) return [];
    const latestYear = YEARS.at(-1);
    const maxes = {};
    selectedCodes.forEach((kod) => {
      maxes[kod] = Math.max(...YEARS.map((y) => national[kod]?.[y]?.[metric] ?? 0)) || 1;
    });
    return YEARS.map((year) => {
      const row = { year };
      selectedCodes.forEach((kod) => {
        row[kod] = (((national[kod]?.[year]?.[metric] ?? 0) / maxes[kod]) * 100).toFixed(1);
      });
      return row;
    });
  }, [national, selectedCodes, metric]);

  // YoY deltas table
  const yoyTable = useMemo(() => {
    return selectedCodes.map((kod) => {
      const proc = procedures.find((p) => p.kod === kod);
      const series = getNationalTimeSeries(national, kod);
      const row = { kod, label: proc?.label || kod };
      YEARS.forEach((y, i) => {
        const cur = series.find((s) => s.year === y)?.[metric] ?? 0;
        const prev = i > 0 ? series.find((s) => s.year === YEARS[i - 1])?.[metric] ?? 0 : null;
        row[`val_${y}`] = cur;
        row[`yoy_${y}`] = prev !== null && prev > 0 ? ((cur - prev) / prev) * 100 : null;
      });
      return row;
    });
  }, [national, procedures, selectedCodes, metric]);

  const getLabelForCode = (kod) => procedures.find((p) => p.kod === kod)?.label || kod;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Srovnání výkonů</h1>
          <p className="text-sm text-gray-500 mt-0.5">Porovnání více procedur najednou</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ProcedureSelect value={selectedCodes} onChange={setSelectedCodes} multi />
          <select value={metric} onChange={(e) => setMetric(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none">
            {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Selected codes chips */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map((kod, i) => (
            <span key={kod} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}22`, color: CHART_COLORS[i % CHART_COLORS.length], border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}44` }}>
              <span className="font-mono">{kod}</span> {getLabelForCode(kod)}
            </span>
          ))}
        </div>
      )}

      {/* Absolute comparison line chart */}
      <ChartContainer title="Absolutní vývoj – srovnání výkonů (2019–2024)" subtitle={METRIC_LABELS[metric]}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={multiSeries} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 14 }} width={65} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              formatter={(v, name) => [fmtFull(v), getLabelForCode(name)]}
            />
            <Legend formatter={(val) => getLabelForCode(val)} wrapperStyle={{ fontSize: 14, color: "#9ca3af" }} />
            <ReferenceLine x="2020" stroke="#ef444440" strokeDasharray="4 4" />
            {selectedCodes.map((kod, i) => (
              <Line key={kod} type="monotone" dataKey={kod} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Indexed (normalised) growth chart */}
      <ChartContainer
        title="Normalizovaný růst (index = 100)"
        subtitle={`Bazový rok: ${baseYear} – srovnatelný relativní vývoj`}
      >
        <div className="flex gap-1 mb-3">
          {YEARS.map((y) => (
            <button key={y} onClick={() => setBaseYear(y)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${y === baseYear ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {y}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={indexedSeries} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 14 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 14 }} width={50} unit=" " />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              formatter={(v, name) => [`${parseFloat(v).toFixed(1)}`, getLabelForCode(name)]} />
            <Legend formatter={(val) => getLabelForCode(val)} wrapperStyle={{ fontSize: 14, color: "#9ca3af" }} />
            <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="3 3" label={{ value: "Bázová hodnota", position: "right", fill: "#6b7280", fontSize: 14 }} />
            <ReferenceLine x="2020" stroke="#ef444440" strokeDasharray="4 4" />
            {selectedCodes.map((kod, i) => (
              <Line key={kod} type="monotone" dataKey={kod} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Radar chart – relative performance across years */}
      <ChartContainer title="Radarový přehled – relativní výkon v % maxima" subtitle="Každý rok jako dimenze, hodnota = % maxima dané procedury">
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#1f2937" />
            <PolarAngleAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 14 }} />
            {selectedCodes.map((kod, i) => (
              <Radar key={kod} name={getLabelForCode(kod)} dataKey={kod}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.1} strokeWidth={2} />
            ))}
            <Legend formatter={(val) => getLabelForCode(val)} wrapperStyle={{ fontSize: 14, color: "#9ca3af" }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              formatter={(v, name) => [`${v}%`, getLabelForCode(name)]} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* YoY Heatmap table */}
      <SectionHeader title="Meziroční změny – heatmapa" subtitle="% změna vs. předchozí rok" />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Výkon</th>
              {YEARS.map((y, i) => i > 0 && (
                <th key={y} className="text-center px-3 py-3 text-gray-400 font-medium">
                  {YEARS[i - 1]}→{y}
                </th>
              ))}
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Celkem ({YEARS[0]})</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Celkem ({YEARS.at(-1)})</th>
            </tr>
          </thead>
          <tbody>
            {yoyTable.map((row, idx) => (
              <tr key={row.kod} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <div>
                    <p className="font-medium text-gray-200 text-xs">{row.label}</p>
                    <p className="font-mono text-xs text-blue-400">{row.kod}</p>
                  </div>
                </td>
                {YEARS.map((y, i) => i > 0 && (
                  <td key={y} className="px-3 py-3 text-center">
                    {row[`yoy_${y}`] !== null ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                        row[`yoy_${y}`] > 5 ? "bg-emerald-900/60 text-emerald-300"
                          : row[`yoy_${y}`] > 0 ? "bg-emerald-900/30 text-emerald-400"
                          : row[`yoy_${y}`] < -5 ? "bg-red-900/60 text-red-300"
                          : row[`yoy_${y}`] < 0 ? "bg-red-900/30 text-red-400"
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {row[`yoy_${y}`] > 0 ? "+" : ""}{row[`yoy_${y}`].toFixed(1)}%
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                ))}
                <td className="px-4 py-3 text-right tabular-nums text-gray-400 text-xs">{fmtFull(row[`val_${YEARS[0]}`] ?? 0)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-200 font-medium">{fmtFull(row[`val_${YEARS.at(-1)}`] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
