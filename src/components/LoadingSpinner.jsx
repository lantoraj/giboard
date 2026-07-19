import React from "react";
import { useT } from "../SettingsContext";

export default function LoadingSpinner({ message = "Načítám data…" }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{t(message)}</p>
    </div>
  );
}
