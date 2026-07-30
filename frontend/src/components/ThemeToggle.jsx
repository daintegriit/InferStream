import React, { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

/**
 * Toggles the `dark` class on <html>, which swaps the token set defined in
 * index.css. Defaults to dark, then to the system preference on first visit.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("inferstream-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("inferstream-theme", theme);
  }, [theme]);

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="flex items-center gap-2 rounded border border-surface-border bg-surface-raised px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-content-secondary transition hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-risk"
    >
      {theme === "dark" ? <FiSun aria-hidden /> : <FiMoon aria-hidden />}
      {next}
    </button>
  );
}