"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "cacheforge-theme";

/** Same-tab notification channel — the native `storage` event only fires in *other* tabs, so setTheme() below dispatches this to wake this tab's useSyncExternalStore subscribers too. */
const THEME_CHANGE_EVENT = "cacheforge-theme-change";

interface ThemeContextValue {
  /** The user's stored preference — may be "system". */
  theme: Theme;
  /** The concrete theme actually applied to the page. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function getThemeServerSnapshot(): Theme {
  return "system";
}

function subscribeToThemeChanges(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

const noopSubscribe = () => () => {};

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

/**
 * Client-side theme state, built on useSyncExternalStore instead of an
 * effect + setState: reading localStorage/matchMedia only resolves to a
 * real value on the client, and React requires the very first client
 * render (hydration) to match the server's output exactly. `hasMounted`
 * stays false for that one hydration-matching render (its server
 * snapshot), so `resolvedTheme` falls back to the same "dark" default
 * app/globals.css's bare `:root` uses — then React's built-in
 * post-hydration re-sync flips it to the real value. The theme-init
 * script in app/layout.tsx already set the actual `data-theme` on
 * <html> before paint, so the page itself never visibly flashes; only
 * this provider's own React-rendered bits (e.g. the toggle's icon) see
 * that one-render placeholder.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const hasMounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    readStoredTheme,
    getThemeServerSnapshot,
  );
  const resolvedTheme: ResolvedTheme = hasMounted
    ? resolveTheme(theme)
    : "dark";

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Preference just won't survive a refresh this time.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Runs before hydration (see app/layout.tsx's `beforeInteractive` Script)
 * to set `data-theme` on <html> synchronously, so the very first paint
 * already matches the stored/system preference instead of flashing dark
 * and then re-painting light (or vice versa).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';var r=(s==='light'||s==='dark')?s:m;document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r;}catch(e){}})();`;
