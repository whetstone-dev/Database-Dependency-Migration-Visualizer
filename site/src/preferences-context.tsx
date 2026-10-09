"use client";
import { createContext, useContext } from "react";
import type { Copy, Locale } from "./i18n";
import type { Theme } from "./components/Preferences";

export const SitePreferences = createContext<{
  c: Copy;
  locale: Locale;
  theme: Theme;
  completeNavigation: (documentation: boolean) => void;
} | null>(null);
export function useSitePreferences() {
  const value = useContext(SitePreferences);
  if (!value) throw new Error("Site preferences require the shared layout");
  return value;
}
