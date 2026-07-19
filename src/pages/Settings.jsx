import React from "react";
import { Settings as SettingsIcon, Languages, Palette, Check, Info } from "lucide-react";
import { useSettings } from "../SettingsContext";

// Mini palette preview swatches for each theme card
const THEME_PREVIEWS = {
  dark:     { bg: "#030712", card: "#111827", accent: "#3b82f6", text: "#e5e7eb" },
  light:    { bg: "#f1f5f9", card: "#ffffff", accent: "#2563eb", text: "#0f172a" },
  graphite: { bg: "#09090b", card: "#18181b", accent: "#3b82f6", text: "#e4e4e7" },
};

function ThemePreview({ id }) {
  const p = THEME_PREVIEWS[id];
  return (
    <div className="w-full h-16 rounded-lg overflow-hidden border border-gray-700/60 flex" style={{ background: p.bg }}>
      {/* mini sidebar */}
      <div className="w-1/5 h-full" style={{ background: p.card }} />
      {/* mini content */}
      <div className="flex-1 p-2 space-y-1.5">
        <div className="h-2 rounded-sm w-1/2" style={{ background: p.accent }} />
        <div className="h-1.5 rounded-sm w-4/5" style={{ background: p.text, opacity: 0.35 }} />
        <div className="h-1.5 rounded-sm w-3/5" style={{ background: p.text, opacity: 0.2 }} />
      </div>
    </div>
  );
}

function OptionCard({ selected, onClick, title, subtitle, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left p-4 rounded-xl border transition-all w-full ${
        selected
          ? "border-blue-400 bg-blue-600/10 shadow-sm"
          : "border-gray-700 bg-gray-900 hover:border-gray-500"
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
          <Check size={12} className="text-white" />
        </span>
      )}
      {children}
      <p className={`text-sm font-semibold mt-3 ${selected ? "text-blue-300" : "text-gray-200"}`}>{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </button>
  );
}

export default function Settings() {
  const { lang, setLang, theme, setTheme, t } = useSettings();

  const LANGS = [
    { id: "cs", title: "Čeština", subtitle: "Czech", flag: "🇨🇿" },
    { id: "en", title: "English", subtitle: t("Angličtina") === "English" ? "Angličtina" : "English", flag: "🇬🇧" },
  ];

  const THEME_OPTIONS = [
    { id: "dark",     title: t("Modrá tmavá"), subtitle: t("Výchozí tmavý vzhled s modrým nádechem") },
    { id: "light",    title: t("Světlá"),      subtitle: t("Bílé pozadí, tmavý text") },
    { id: "graphite", title: t("Grafitová"),   subtitle: t("Neutrální tmavě šedý vzhled") },
  ];

  return (
    <div className="max-w-2xl mx-auto py-10 px-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
          <SettingsIcon size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-100">{t("Nastavení")}</h1>
          <p className="text-sm text-gray-500">{t("Vzhled a jazyk aplikace")}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── Language ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Languages size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">{t("Jazyk")}</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">{t("Jazyk uživatelského rozhraní")}</p>
          <div className="grid grid-cols-2 gap-3">
            {LANGS.map((l) => (
              <OptionCard
                key={l.id}
                selected={lang === l.id}
                onClick={() => setLang(l.id)}
                title={l.title}
                subtitle={l.subtitle}
              >
                <span className="text-3xl leading-none">{l.flag}</span>
              </OptionCard>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-3 text-xs text-gray-500">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>{t("Názvy pracovišť a oficiální citace zůstávají v češtině (pocházejí přímo ze zdrojových dat).")}</span>
          </div>
        </section>

        {/* ── Theme ────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">{t("Barevné téma")}</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">{t("Vzhled aplikace")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((th) => (
              <OptionCard
                key={th.id}
                selected={theme === th.id}
                onClick={() => setTheme(th.id)}
                title={th.title}
                subtitle={th.subtitle}
              >
                <ThemePreview id={th.id} />
              </OptionCard>
            ))}
          </div>
        </section>

        <p className="text-xs text-gray-600">{t("Nastavení se ukládá automaticky ve vašem prohlížeči.")}</p>
      </div>
    </div>
  );
}
