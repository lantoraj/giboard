import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { MapPin, Info, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useT } from "../SettingsContext";

const MAP_W = 800;
const MAP_H = 420;

const KRAJ_COLORS = {
  CZ010: "#1d4ed8",
  CZ020: "#0369a1",
  CZ031: "#047857",
  CZ032: "#065f46",
  CZ041: "#7c3aed",
  CZ042: "#6d28d9",
  CZ051: "#0891b2",
  CZ052: "#0e7490",
  CZ053: "#155e75",
  CZ063: "#92400e",
  CZ064: "#b45309",
  CZ071: "#15803d",
  CZ072: "#166534",
  CZ080: "#9f1239",
};

const fmt = (n) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)} M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)} K`
    : String(Math.round(n));

const fmtFull = (n) => Math.round(n).toLocaleString("cs-CZ");

function normCity(city) {
  if (!city) return "";
  return city.trim();
}

function resolveCoords(city, cityCoords) {
  if (!city) return null;
  const c = normCity(city);
  if (cityCoords[c]) return cityCoords[c];
  const base = c.replace(/\s+\d+$/, "").trim();
  if (base !== c && cityCoords[base]) return cityCoords[base];
  const dash = c.split("-")[0].trim();
  if (dash !== c && cityCoords[dash]) return cityCoords[dash];
  return null;
}

// Stable jitter per provider (deterministic from ICO)
function hashJitter(ico) {
  let h = 0;
  for (let i = 0; i < ico.length; i++) h = (h * 31 + ico.charCodeAt(i)) | 0;
  const jx = ((h & 0xffff) / 0xffff - 0.5) * 0.05;
  const jy = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.05;
  return [jx, jy];
}

export default function ProcedureMap({ providers, selectedKod, metric, selectedYear }) {
  const t = useT();
  const [cityCoords, setCityCoords] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch("/data/cz_city_coords.json").then((r) => r.json()).then(setCityCoords).catch(() => {});
    fetch("/data/cz_kraje.geojson").then((r) => r.json()).then(setGeojson).catch(() => {});
  }, []);

  // D3 projection
  const projection = useMemo(
    () =>
      geoMercator()
        .center([15.5, 49.75])
        .scale(4800)
        .translate([MAP_W / 2, MAP_H / 2]),
    []
  );

  const pathGen = useMemo(() => geoPath().projection(projection), [projection]);

  // Build markers – use selectedYear value, not sum across all years
  const markers = useMemo(() => {
    if (!cityCoords || !providers || !selectedKod) return [];
    const metricKey = metric === "pocet_pacientu" ? "pp" : "mn";
    const result = [];
    for (const prov of providers) {
      const procData = prov.procs?.[selectedKod];
      if (!procData) continue;
      // Use selected year; fall back to latest available year if not present
      const yearData = procData[selectedYear] ?? procData[Object.keys(procData).sort().at(-1)];
      const total = yearData?.[metricKey] || 0;
      if (total <= 0) continue;
      const coords = resolveCoords(prov.city, cityCoords);
      if (!coords) continue;
      const [jx, jy] = hashJitter(prov.ico);
      const [px, py] = projection([coords[1] + jx, coords[0] + jy]);
      result.push({ ico: prov.ico, name: prov.name, city: prov.city, kraj: prov.kraj, total, px, py });
    }
    return result;
  }, [providers, selectedKod, cityCoords, metric, selectedYear, projection]);

  const maxTotal = useMemo(() => Math.max(...markers.map((m) => m.total), 1), [markers]);

  const getRadius = (total) => {
    const t = Math.log1p(total) / Math.log1p(maxTotal);
    return 3 + t * 20;
  };

  const getColor = (total) => {
    const t = Math.log1p(total) / Math.log1p(maxTotal);
    const r = Math.round(29 + (191 - 29) * (1 - t));
    const g = Math.round(78 + (219 - 78) * (1 - t));
    const b = Math.round(216 + (254 - 216) * (1 - t));
    return `rgb(${r},${g},${b})`;
  };

  const metricLabel = t({ mnozstvi: "výkonů", pocet_pacientu: "pacientů", pocet_kontaktu: "kontaktů" }[metric] || "výkonů");

  // Zoom handlers
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(0.8, z * (e.deltaY < 0 ? 1.15 : 0.87))));
  }, []);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMarkerEnter = (m, e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    setTooltip(m);
    setTooltipPos({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  };

  if (!cityCoords || !geojson) {
    return (
      <div className="card p-6 flex items-center justify-center h-64 text-gray-500 text-sm">
        {t("Načítám data mapy…")}
      </div>
    );
  }

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  const sortedMarkers = [...markers].sort((a, b) => b.total - a.total);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">
            {t("Mapa pracovišť – výkon {kod} · rok {year}", { kod: selectedKod, year: selectedYear })}
          </span>
          <span className="text-xs text-gray-500">
            {t("({n} pracovišť s daty)", { n: markers.length })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block rounded-full border border-blue-300/30" style={{ width: 8, height: 8, background: "#bfdbfe" }} />
              {t("méně")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block rounded-full border border-blue-600/30" style={{ width: 16, height: 16, background: "#1d4ed8" }} />
              {t("více {metric}", { metric: metricLabel })}
            </span>
          </div>
          {/* Zoom buttons */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.min(8, z * 1.3))} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400" title={t("Přiblížit")}><ZoomIn size={14} /></button>
            <button onClick={() => setZoom(z => Math.max(0.8, z / 1.3))} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400" title={t("Oddálit")}><ZoomOut size={14} /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400" title="Reset"><RotateCcw size={14} /></button>
          </div>
        </div>
      </div>

      {/* SVG Map */}
      <div
        className="relative bg-gray-950 select-none"
        style={{ height: MAP_H, cursor: isDragging.current ? "grabbing" : "grab" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setTooltip(null); }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={MAP_H}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          onMouseDown={handleMouseDown}
        >
          <g style={{ transform, transformOrigin: `${MAP_W / 2}px ${MAP_H / 2}px`, transition: isDragging.current ? "none" : "transform 0.1s" }}>
            {/* Kraje */}
            {geojson.features.map((feat) => {
              const nutsId = feat.properties.NUTS_ID;
              const color = KRAJ_COLORS[nutsId] || "var(--map-land)";
              return (
                <path
                  key={nutsId}
                  d={pathGen(feat)}
                  fill={color}
                  fillOpacity={0.35}
                  stroke="var(--map-stroke)"
                  strokeWidth={0.6}
                />
              );
            })}

            {/* Markers – largest rendered first (appear behind) */}
            {sortedMarkers.map((m) => (
              <circle
                key={m.ico}
                cx={m.px}
                cy={m.py}
                r={getRadius(m.total)}
                fill={getColor(m.total)}
                fillOpacity={0.85}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={0.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => handleMarkerEnter(m, e)}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x + 12, MAP_W - 220),
              top: Math.max(tooltipPos.y - 60, 4),
            }}
          >
            <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl w-52">
              <p className="text-xs font-semibold text-strong leading-tight truncate">{tooltip.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {tooltip.city}{tooltip.kraj ? ` · ${tooltip.kraj}` : ""}
              </p>
              <p className="text-sm font-bold text-blue-400 mt-1.5 tabular-nums">
                {fmtFull(tooltip.total)}{" "}
                <span className="text-xs font-normal text-gray-400">{metricLabel}</span>
              </p>
            </div>
          </div>
        )}

        {/* Zoom hint */}
        <div className="absolute bottom-2 left-3 text-xs text-gray-600 flex items-center gap-1 pointer-events-none">
          <Info size={11} />
          {t("Kolečko myši = zoom · Tažení = posun · Hover = detail pracoviště")}
        </div>
      </div>

      {/* Top 5 list */}
      {markers.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">{t("Top 5 pracovišť")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sortedMarkers.slice(0, 5).map((m, i) => (
              <div key={`${m.ico}-${i}`} className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: getColor(m.total), minWidth: 20, fontSize: 10 }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.city} · {fmt(m.total)} {metricLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
