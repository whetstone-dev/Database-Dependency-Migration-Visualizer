"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { copies, type Copy, type Locale } from "./i18n";
import { Arrow, Mark } from "./components/Icons";
import {
  Preferences,
  persistPreference,
  type Theme,
} from "./components/Preferences";
import { SitePreferences } from "./preferences-context";
import { useReducedMotion } from "./useReducedMotion";
import { usePageMotion } from "./usePageMotion";
import { assetPath } from "./paths";
import { version } from "../package.json";

const repository =
  "https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer";

function Brand({ c }: { c: Copy }) {
  return (
    <Link className="brand" href="/" scroll={false} aria-label={c.home}>
      <Mark />
      <span>
        whetstone<span className="brand-divider">/</span>
        <strong>dbdep</strong>
      </span>
    </Link>
  );
}

export default function App({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const navigationFocus = useRef(false);
  const router = useRouter();
  const isDocs = pathname === "/docs" || pathname.startsWith("/docs/");
  const reduced = useReducedMotion();
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const c = copies[locale];
  usePageMotion(root, reduced || isDocs, locale);
  useLayoutEffect(() => {
    setLocale(document.documentElement.lang === "es" ? "es" : "en");
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );
    setReady(true);
  }, []);
  useEffect(() => {
    const legacyRoute = () => {
      const match = /^#\/docs(?:\/([a-z-]+))?\/?$/.exec(window.location.hash);
      if (match) {
        navigationFocus.current = true;
        router.replace(`/docs/${match[1] ? `${match[1]}/` : ""}`, {
          scroll: false,
        });
      }
    };
    legacyRoute();
    window.addEventListener("hashchange", legacyRoute);
    const historyFocus = () => {
      navigationFocus.current = true;
    };
    window.addEventListener("popstate", historyFocus);
    return () => {
      window.removeEventListener("hashchange", legacyRoute);
      window.removeEventListener("popstate", historyFocus);
    };
  }, [router]);
  const completeNavigation = (documentation: boolean) => {
    const fragment = window.location.hash.slice(1);
    const target = documentation
      ? document.getElementById("docs-heading")
      : document.getElementById(fragment || "main");
    if ((!navigationFocus.current && !fragment) || !target) return;
    navigationFocus.current = false;
    if (fragment && !documentation)
      target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    target.focus({ preventScroll: true });
  };
  const handleRoute = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a")
        : null;
    const href = anchor?.getAttribute("href");
    if (isDocs && href === "#main") {
      event.preventDefault();
      const main = document.getElementById("main");
      main?.scrollIntoView({ behavior: "instant" });
      main?.focus({ preventScroll: true });
    } else if (href && !href.startsWith("#")) {
      const destination = new URL(href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname !== window.location.pathname
      )
        navigationFocus.current = true;
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        !destination.hash
      ) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "instant" });
        document
          .getElementById(isDocs ? "docs-heading" : "main")
          ?.focus({ preventScroll: true });
      }
    }
  };
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    if (!isDocs) document.title = c.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", c.description);
  }, [locale, c, isDocs, ready]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#10141c" : "#f8fafc");
  }, [theme, ready]);
  useEffect(() => {
    const pointer = () => {
      document.documentElement.dataset.input = "pointer";
    };
    const keyboard = () => {
      document.documentElement.dataset.input = "keyboard";
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    document.addEventListener("wheel", pointer, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("wheel", pointer);
    };
  }, []);
  const sectionLink = (id: string, label: string) =>
    isDocs ? (
      <Link href={`/#${id}`} scroll={false}>
        {label}
      </Link>
    ) : (
      <a href={`#${id}`}>{label}</a>
    );
  return (
    <SitePreferences.Provider value={{ c, locale, theme, completeNavigation }}>
      <div ref={root} onClickCapture={handleRoute} data-site-ready={ready}>
        <a className="skip-link" href="#main">
          {c.skip}
        </a>
        <div className="reading-progress" aria-hidden="true" />
        <header className="site-header">
          <div className="header-inner">
            <Brand c={c} />
            <nav aria-label={c.nav.label}>
              {sectionLink("workflow", c.nav.workflow)}
              {sectionLink("examples", c.nav.examples)}
              {sectionLink("install", c.nav.install)}
              <Link
                href="/docs/"
                scroll={false}
                aria-current={isDocs ? "page" : undefined}
              >
                {c.nav.docs}
              </Link>
            </nav>
            <Preferences
              c={c}
              locale={locale}
              theme={theme}
              onLocale={(value) => {
                setLocale(value);
                persistPreference("locale", value);
              }}
              onTheme={(value) => {
                setTheme(value);
                persistPreference("theme", value);
              }}
            />
            <a
              className="header-github"
              href={repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
              <Arrow diagonal />
            </a>
          </div>
        </header>
        {children}
        <footer className="site-footer section">
          <div>
            <Brand c={c} />
            <p className="mono">
              {c.footer.line} · v{version}
            </p>
          </div>
          <div className="footer-links">
            <Link href="/docs/" scroll={false}>
              {c.nav.docs}
              <Arrow />
            </Link>
            <a href={repository}>
              {c.footer.source}
              <Arrow diagonal />
            </a>
            <a href={assetPath("docs/SKILL.md")}>
              {c.footer.skill}
              <Arrow diagonal />
            </a>
            <a href={assetPath("THIRD_PARTY_NOTICES.md")}>
              {c.footer.notices}
              <Arrow diagonal />
            </a>
          </div>
        </footer>
      </div>
    </SitePreferences.Provider>
  );
}
