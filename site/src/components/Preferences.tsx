import type { Copy, Locale } from "../i18n";

export type Theme = "light" | "dark";

export function persistPreference(key: string, value: string) {
  try {
    localStorage.setItem(`dbdep-${key}`, value);
  } catch {
    /* Preferences still work when browser storage is unavailable. */
  }
}

export function Preferences({
  c,
  locale,
  theme,
  onLocale,
  onTheme,
}: {
  c: Copy;
  locale: Locale;
  theme: Theme;
  onLocale: (locale: Locale) => void;
  onTheme: (theme: Theme) => void;
}) {
  return (
    <div className="preferences">
      <div
        className="language-control"
        role="group"
        aria-label={c.preferences.language}
      >
        <button
          type="button"
          lang="en"
          aria-label="English"
          aria-pressed={locale === "en"}
          onClick={() => onLocale("en")}
        >
          ENG
        </button>
        <button
          type="button"
          lang="es"
          aria-label="Español"
          aria-pressed={locale === "es"}
          onClick={() => onLocale("es")}
        >
          ESP
        </button>
      </div>
      <button
        type="button"
        className="theme-control"
        aria-label={
          theme === "light" ? c.preferences.dark : c.preferences.light
        }
        aria-pressed={theme === "dark"}
        onClick={() => onTheme(theme === "light" ? "dark" : "light")}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {theme === "light" ? (
            <path
              d="M20.6 13.5A8.5 8.5 0 0 1 10.5 3.4 8.5 8.5 0 1 0 20.6 13.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <circle
                cx="12"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
