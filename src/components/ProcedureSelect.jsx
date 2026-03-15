import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { useData } from "../DataContext";

export default function ProcedureSelect({ value, onChange, multi = false, placeholder = "Vyberte výkon…" }) {
  const { procedures } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = procedures.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.label.toLowerCase().includes(q) ||
      p.kod.includes(q) ||
      (p.szv_code && p.szv_code.includes(q))
    );
  });

  const isSelected = (kod) =>
    multi ? (value || []).includes(kod) : value === kod;

  const toggle = (kod) => {
    if (multi) {
      const cur = value || [];
      onChange(isSelected(kod) ? cur.filter((k) => k !== kod) : [...cur, kod]);
    } else {
      onChange(kod);
      setOpen(false);
    }
  };

  const selectedProc = procedures.find((p) => p.kod === value);
  const displayLabel = multi
    ? value?.length
      ? `${value.length} výkon${value.length > 1 ? "ů" : ""} vybrán`
      : placeholder
    : selectedProc
    ? `${selectedProc.szv_code ?? selectedProc.kod} – ${selectedProc.label}`
    : placeholder;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 hover:border-blue-500 transition-colors w-full min-w-[220px]"
      >
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        {multi && value?.length > 0 && (
          <span
            className="text-gray-500 hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-800">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded-lg">
              <Search size={13} className="text-gray-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent text-sm text-gray-200 outline-none flex-1 placeholder-gray-600"
                placeholder="Hledat kód nebo název…"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-gray-500 p-3 text-center">Žádné výsledky</p>
            )}
            {filtered.map((p) => (
              <button
                key={p.kod}
                onClick={() => toggle(p.kod)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-gray-800 transition-colors ${isSelected(p.kod) ? "bg-blue-900/30" : ""}`}
              >
                <span className="font-mono text-xs text-blue-400 w-14 flex-shrink-0">{p.szv_code ?? p.kod}</span>
                <span className="text-sm text-gray-200 flex-1 leading-tight">{p.label}</span>
                {isSelected(p.kod) && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
