/** @type {import('tailwindcss').Config} */

// Helper: map a Tailwind scale to CSS variables so themes can swap palettes.
// Variables hold "R G B" triplets → alpha modifiers (bg-gray-900/70) keep working.
const varScale = (prefix, shades) =>
  Object.fromEntries(shades.map((s) => [s, `rgb(var(--${prefix}${s}) / <alpha-value>)`]));

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        // Theme-aware neutral scale (dark: Tailwind gray, light: inverted slate, graphite: zinc)
        gray: varScale("g", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        // Strongest emphasis text: white on dark themes, near-black on light
        strong: "rgb(var(--c-strong) / <alpha-value>)",
        // Theme-aware accent shades (only the ones used with dark backgrounds / light text)
        blue:    { ...varScale("blue",    [200, 300, 400, 700, 800, 900, 950]) },
        emerald: { ...varScale("emerald", [200, 300, 400, 700, 800, 900]) },
        red:     { ...varScale("red",     [200, 300, 400, 700, 800, 900]) },
        amber:   { ...varScale("amber",   [200, 300, 400, 700, 800, 900]) },
        purple:  { ...varScale("purple",  [200, 300, 400, 700, 800, 900]) },
        yellow:  { ...varScale("yellow",  [200, 300, 400, 700, 800, 900]) },
      },
    },
  },
  plugins: [],
};
