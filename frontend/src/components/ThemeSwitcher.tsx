import { useEffect, useState } from "react";
import { Button } from "@heroui/react";

type Theme = "brodie" | "brodie-dark";

const THEME_STORAGE_KEY = "therefore-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "brodie";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "brodie" || stored === "brodie-dark") {
    return stored;
  }
  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "brodie-dark";
  }
  return "brodie";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// Sun icon for light mode
function SunIcon() {
  return (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" x2="12" y1="1" y2="3" />
      <line x1="12" x2="12" y1="21" y2="23" />
      <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
      <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
      <line x1="1" x2="3" y1="12" y2="12" />
      <line x1="21" x2="23" y1="12" y2="12" />
      <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
      <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
    </svg>
  );
}

// Moon icon for dark mode
function MoonIcon() {
  return (
    <svg
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("brodie");
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = getStoredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "brodie" ? "brodie-dark" : "brodie";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const isDark = theme === "brodie-dark";

  // Prevent hydration mismatch - render placeholder with same dimensions
  if (!mounted) {
    return (
      <Button
        isIconOnly
        aria-label="Toggle theme"
        variant="ghost"
        size="sm"
        className="rounded-full"
      >
        <SunIcon />
      </Button>
    );
  }

  return (
    <Button
      isIconOnly
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      variant="ghost"
      size="sm"
      className="rounded-full"
      onPress={toggleTheme}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </Button>
  );
}
