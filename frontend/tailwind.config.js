/** @type {import('tailwindcss').Config} */
export default {
  // Theme is driven by a `dark` class on <html>, set by ThemeToggle.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Every colour resolves through a CSS variable, so both themes use
        // the same class names and only the values change.
        surface: {
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          border: "var(--surface-border)",
        },
        content: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        // Semantic, not decorative:
        //   risk   -> elevated probability, material disparity, failure
        //   safe   -> verified, healthy, low risk
        //   accent -> high-contrast chrome
        risk: {
          DEFAULT: "var(--risk)",
          dim: "var(--risk-dim)",
          wash: "var(--risk-wash)",
        },
        safe: {
          DEFAULT: "var(--safe)",
          dim: "var(--safe-dim)",
          wash: "var(--safe-wash)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};