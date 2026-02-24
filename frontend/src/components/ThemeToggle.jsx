import React from "react";
import { FaMoon, FaSun } from "react-icons/fa";

const ThemeToggle = ({ theme, setTheme }) => {
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-full flex items-center gap-2 text-sm shadow"
    >
      {theme === "dark" ? <FaSun /> : <FaMoon />}
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
};

export default ThemeToggle;
