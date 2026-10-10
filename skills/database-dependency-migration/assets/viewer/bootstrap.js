// Apply shared website preferences before styles are parsed. English is the default.
(() => {
  let theme, locale;
  try {
    theme = localStorage.getItem("dbdep-theme");
    locale = localStorage.getItem("dbdep-locale");
  } catch {
    // The report remains usable when browser storage is unavailable.
  }
  const dark =
    theme === "dark" ||
    (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.locale = locale === "es" ? "es" : "en";
  document.documentElement.lang = locale === "es" ? "es" : "en";
})();
