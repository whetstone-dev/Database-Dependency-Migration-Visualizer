import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/archivo";
import "@fontsource/ibm-plex-mono/400.css";
import "lenis/dist/lenis.css";
import "../styles.css";
import App from "../App";
import { assetPath } from "../paths";

export const metadata: Metadata = {
  title: "Database dependency migration · Whetstone",
  description:
    "Source-backed PostgreSQL dependency graphs, blast-radius analysis, and review-only migration plans for AI coding agents.",
  icons: { icon: assetPath("favicon.svg") },
};
export const viewport: Viewport = { themeColor: "#f8fafc" };

const bootstrap = `(() => {
  let theme, locale;
  try {
    theme = localStorage.getItem("dbdep-theme");
    locale = localStorage.getItem("dbdep-locale");
  } catch {}
  const dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.lang = locale === "es" ? "es" : "en";
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      </head>
      <body>
        <App>{children}</App>
      </body>
    </html>
  );
}
