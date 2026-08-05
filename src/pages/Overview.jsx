import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Activity, Users, Hash, TrendingUp, Info } from "lucide-react";

import { useData, getNationalTimeSeries, getMultiCodeTimeSeries } from "../DataContext";
import { useSettings } from "../SettingsContext";
import { KEY_CODES_BY_SPEC, CHART_COLORS, CHART_UI, YEARS, getSpec } from "../constants";
import KpiCard from "../components/KpiCard";
import ChartContainer from "../components/ChartContainer";
import SectionHeader from "../components/SectionHeader";

const fmt     = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(2)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} K` : String(Math.round(n));
const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

function yoyDelta(series, metric = "mnozstvi") {
  if (series.length < 2) return undefined;
  const last = series[series.length - 1][metric] || 0;
  const prev = series[series.length - 2][metric] || 1;
  return ((last - prev) / prev) * 100;
}

const FILTER_OPTIONS = [
  { id: "key",   label: "Klíčové výkony" },
  { id: "top10", label: "Top 10" },
  { id: "top20", label: "Top 20" },
  { id: "all",   label: "Vše" },
];

const CHART_LINE_LIMIT = 20; // max lines rendered in trend chart

export default function Overview() {
  const { national, procedures } = useData();
  const { spec, t } = useSettings();
  const specCfg = getSpec(spec);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [compFilter, setCompFilter]     = useState("key");

  // ── National aggregate KPIs ──────────────────────────────────────────────
  const kpiData = useMemo(() => {
    let totalMn = 0, totalPp = 0, totalKk = 0;
    Object.values(national).forEach((byYear) => {
      const v = byYear[selectedYear];
      if (v) { totalMn += v.mnozstvi || 0; totalPp += v.pocet_pacientu || 0; totalKk += v.pocet_kontaktu || 0; }
    });
    return { totalMn, totalPp, totalKk };
  }, [national, selectedYear]);

  // Localized key codes (labels for chart legend / table)
  const keyCodes = useMemo(
    () => (KEY_CODES_BY_SPEC[spec] ?? []).map((k) => ({ ...k, label: t(k.label) })),
    [spec, t]
  );

  // ── Filtered procedure list (with color assigned) ────────────────────────
  const compProcs = useMemo(() => {
    if (compFilter === "key") return keyCodes;

    const allSorted = procedures
      .map((p) => ({ ...p, vol: national[p.kod]?.[selectedYear]?.mnozstvi ?? 0 }))
      .filter((p) => p.vol > 0)
      .sort((a, b) => b.vol - a.vol);

    const subset =
      compFilter === "top10" ? allSorted.slice(0, 10)
      : compFilter === "top20" ? allSorted.slice(0, 20)
      : allSorted; // "all"

    return subset.map((p, i) => ({
      ...p,
      color:    CHART_COLORS[i % CHART_COLORS.length],
      szv_code: p.szv_code ?? p.kod,
    }));
  }, [compFilter, keyCodes, procedures, national, selectedYear]);

  // For chart: cap lines to keep chart readable
  const chartProcs  = useMemo(() => compProcs.slice(0, CHART_LINE_LIMIT), [compProcs]);
  const chartCapped = compProcs.length > CHART_LINE_LIMIT;

  // Multi-series data for trend line chart
  const compSeries = useMemo(
    () => getMultiCodeTimeSeries(national, chartProcs.map((c) => c.kod)),
    [national, chartProcs]
  );

  // ── Top 15 bar chart ─────────────────────────────────────────────────────
  const topProcs = useMemo(() =>
    procedures
      .map((p) => ({ ...p, value: national[p.kod]?.[selectedYear]?.mnozstvi ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15),
    [procedures, national, selectedYear]
  );

  // ── YoY delta for the per-specialty trend KPI card ───────────────────────
  const trendSeries = useMemo(() => getNationalTimeSeries(national, specCfg.trendKod), [national, specCfg.trendKod]);
  const trendDelta  = yoyDelta(trendSeries);

  // ── Dynamic labels ────────────────────────────────────────────────────────
  const trendTitle =
    compFilter === "key"   ? t("Vývoj klíčových endoskopických výkonů (2019–2024)")
    : compFilter === "top10" ? t("Vývoj Top 10 výkonů dle objemu – rok {year} (2019–2024)", { year: selectedYear })
    : compFilter === "top20" ? t("Vývoj Top 20 výkonů dle objemu – rok {year} (2019–2024)", { year: selectedYear })
    : t("Vývoj výkonů – zobrazeno Top {n} z {total} (2019–2024)", { n: CHART_LINE_LIMIT, total: compProcs.length });

  const tableTitle = compFilter === "key"
    ? t("Meziroční srovnání klíčových výkonů")
    : t("Meziroční srovnání výkonů");

  const tableSubtitle = compFilter === "key"
    ? t("Absolutní hodnoty + změna vs. předchozí rok")
    : t("{n} výkonů · seřazeno dle objemu {year} · absolutní hodnoty + YoY %", { n: compProcs.length, year: selectedYear });

  // ── Filter toggle buttons (rendered inside ChartContainer header) ────────
  const filterControls = (
    <div className="flex gap-1">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setCompFilter(opt.id)}
          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
            compFilter === opt.id
              ? "bg-blue-600 text-white"
              : "bg-gray-700/70 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
          }`}
        >
          {t(opt.label)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Year selector ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-strong">{t("Přehled")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t(specCfg.label)} – ČR</p>
        </div>
        <div className="flex gap-1">
          {YEARS.map((y) => (
            <button key={y} onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                y === selectedYear ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ── Data note ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-300">
        <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
        <span>
          {t("Data pocházejí z")} <strong>NRHZS (ÚZIS ČR)</strong>, {t("období 2019–2024.")}{" "}
          {t("Pole")} <em>{t("množství výkonů")}</em> {t("odpovídá součtu vykázaných množství z pojišťoven – pro každý kód může jít o bodové hodnoty, počty úkonů nebo jiné jednotky dle sazebníku.")}{" "}
          {t("Pro klinické srovnání doporučujeme metriku")} <em>{t("Počet pacientů")}</em>.{" "}
          {t("Data neobsahují identifikátor poskytovatele – regionální analýza je dle okresu")} <em>{t("bydliště pacienta")}</em>.
        </span>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("Objem výkonů")}      value={fmt(kpiData.totalMn)} subtitle={t("Rok {year} – všechny výkony odbornosti", { year: selectedYear })} icon={Activity} color="#3b82f6" />
        <KpiCard title={t("Unikátní pacienti")} value={fmt(kpiData.totalPp)} subtitle={t("Rok {year}", { year: selectedYear })}                      icon={Users}    color="#10b981" />
        <KpiCard title={t("Kontakty")}          value={fmt(kpiData.totalKk)} subtitle={t("Rok {year}", { year: selectedYear })}                      icon={Hash}     color="#8b5cf6" />
        <KpiCard title={t(specCfg.trendLabel)}
          value={fmt(trendSeries.at(-1)?.mnozstvi ?? 0)}
          subtitle={t(specCfg.trendSubtitle)}
          delta={trendDelta} deltaLabel={t("vs. předchozí rok")}
          icon={TrendingUp} color="#f59e0b"
        />
      </div>

      {/* ── Trend line chart (filter-controlled) ────────────────────────── */}
      <ChartContainer
        title={trendTitle}
        subtitle={t("Počet výkonů dle roku – celostátně")}
        controls={filterControls}
      >
        <ResponsiveContainer width="100%" height={chartProcs.length > 8 ? 420 : 340}>
          <LineChart data={compSeries} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} />
            <XAxis dataKey="year" tick={{ fill: CHART_UI.tick, fontSize: 14 }} />
            <YAxis tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 14 }} width={60} />
            <Tooltip
              contentStyle={CHART_UI.tooltip}
              labelStyle={CHART_UI.tooltipLabel}
              itemStyle={CHART_UI.tooltipItem}
              formatter={(v, name) => {
                const c = chartProcs.find((x) => x.kod === name);
                return [fmt(v), c ? `${c.szv_code ?? c.kod} – ${c.label}` : name];
              }}
            />
            <Legend
              formatter={(val) => {
                const c = chartProcs.find((x) => x.kod === val);
                return c ? `${c.szv_code ?? c.kod} – ${c.label}` : val;
              }}
              wrapperStyle={{ fontSize: compFilter === "key" ? 14 : 13, color: CHART_UI.tick }}
            />
            <ReferenceLine x="2020" stroke="#ef444455" strokeDasharray="4 4"
              label={{ value: "COVID-19", position: "top", fill: "#ef4444", fontSize: 14 }} />
            {chartProcs.map((c) => (
              <Line key={c.kod} type="monotone" dataKey={c.kod}
                stroke={c.color} strokeWidth={2}
                dot={{ r: compFilter === "key" ? 3 : 2, fill: c.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {chartCapped && (
          <p className="text-xs text-amber-500/80 mt-2 text-center">
            {t("Graf zobrazuje Top {n} výkonů. Tabulka níže obsahuje všech {total} výkonů.", { n: CHART_LINE_LIMIT, total: compProcs.length })}
          </p>
        )}
      </ChartContainer>

      {/* ── Top 15 bar chart (always full list, year-sensitive) ─────────── */}
      <ChartContainer
        title={t("Top 15 výkonů dle objemu – rok {year}", { year: selectedYear })}
        subtitle={t("Celkový počet vykázaných výkonů")}
      >
        <ResponsiveContainer width="100%" height={540}>
          <BarChart data={topProcs} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 200 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_UI.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fill: CHART_UI.tick, fontSize: 14 }} />
            <YAxis type="category" dataKey="label" tick={{ fill: CHART_UI.tickStrong, fontSize: 14 }} width={195} />
            <Tooltip
              contentStyle={CHART_UI.tooltip}
              itemStyle={CHART_UI.tooltipItem}
              formatter={(v, _name, props) => {
                const p = props?.payload;
                const code = p?.szv_code ? `${p.szv_code} – ` : "";
                return [fmt(v), `${code}${p?.label ?? t("Počet výkonů")}`];
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* ── YoY comparison table (filter-controlled) ────────────────────── */}
      <SectionHeader title={tableTitle} subtitle={tableSubtitle} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">{t("Výkon")}</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium font-mono">{t("SZV kód")}</th>
              {YEARS.map((y) => (
                <th key={y} className={`text-right px-3 py-3 font-medium ${y === selectedYear ? "text-blue-400" : "text-gray-400"}`}>{y}</th>
              ))}
              <th className="text-right px-4 py-3 text-gray-400 font-medium">YoY %</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium whitespace-nowrap">2019→2024</th>
            </tr>
          </thead>
          <tbody>
            {compProcs.map((c) => {
              const series    = getNationalTimeSeries(national, c.kod);
              const seriesMap = Object.fromEntries(series.map((s) => [s.year, s.mnozstvi]));
              const delta     = yoyDelta(series);
              const v2019     = seriesMap["2019"] ?? 0;
              const v2024     = seriesMap["2024"] ?? 0;
              const delta5y   = v2019 > 0 ? ((v2024 - v2019) / v2019) * 100 : null;
              return (
                <tr key={c.kod} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      {c.label}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400 whitespace-nowrap">
                    {c.szv_code ?? c.kod}
                  </td>
                  {YEARS.map((y) => (
                    <td key={y} className={`px-3 py-3 text-right tabular-nums ${y === selectedYear ? "text-gray-200 font-semibold" : "text-gray-400"}`}>
                      {fmtFull(seriesMap[y] ?? 0)}
                    </td>
                  ))}
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    delta === undefined ? "text-gray-600"
                    : delta > 0 ? "text-emerald-400"
                    : delta < 0 ? "text-red-400"
                    : "text-gray-500"
                  }`}>
                    {delta !== undefined ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    delta5y === null ? "text-gray-600"
                    : delta5y > 0 ? "text-emerald-300"
                    : delta5y < 0 ? "text-red-300"
                    : "text-gray-500"
                  }`}>
                    {delta5y !== null ? `${delta5y > 0 ? "+" : ""}${delta5y.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
