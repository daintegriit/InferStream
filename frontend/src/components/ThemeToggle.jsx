import React, { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

/**
 * Owns its own state. The previous version required `theme` and `setTheme`
 * props that Navbar never passed, so clicking it called undefined().
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("inferstream-theme") || "dark";
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
      className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400 transition hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      {theme === "dark" ? <FaSun aria-hidden /> : <FaMoon aria-hidden />}
      {next}
    </button>
  );
}