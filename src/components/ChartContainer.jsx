import React from "react";

export default function ChartContainer({ title, subtitle, children, className = "", controls }) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || controls) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-gray-200">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {controls && <div className="flex-shrink-0">{controls}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
