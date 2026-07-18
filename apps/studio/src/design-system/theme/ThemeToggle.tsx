import {
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const stored = localStorage.getItem(
    "ghost-audience-theme",
  );

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}

export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] =
    useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;
    localStorage.setItem(
      "ghost-audience-theme",
      theme,
    );
  }, [theme]);

  const nextTheme =
    theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="button button--ghost"
      aria-label={`Use ${nextTheme} theme`}
      onClick={() => setTheme(nextTheme)}
    >
      {theme === "dark" ? (
        <Sun aria-hidden="true" size={19} />
      ) : (
        <Moon aria-hidden="true" size={19} />
      )}
    </button>
  );
}