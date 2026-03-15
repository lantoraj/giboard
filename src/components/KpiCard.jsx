import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function KpiCard({ title, value, subtitle, delta, deltaLabel, color = "#3b82f6", icon: Icon }) {
  const trend =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</span>
        {Icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
            <Icon size={16} style={{ color }} />
          </span>
        )}
      </div>

      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        {delta !== undefined && (
          <span className={`flex items-center gap-1 text-sm font-medium pb-0.5 ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-500"}`}>
            {trend === "up" ? <TrendingUp size={14} /> : trend === "down" ? <TrendingDown size={14} /> : <Minus size={14} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      {deltaLabel && <p className="text-xs text-gray-600">{deltaLabel}</p>}
    </div>
  );
}
