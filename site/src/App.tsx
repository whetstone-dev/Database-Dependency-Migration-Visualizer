import { useEffect, useRef, useState, type ReactNode } from "react";
import { copies, type Copy, type Locale } from "./i18n";
import { Arrow, Mark } from "./components/Icons";
import {
  Preferences,
  persistPreference,
  type Theme,
} from "./components/Preferences";
import { ImpactStudy } from "./components/ImpactStudy";
import { AnalysisFlow } from "./components/AnalysisFlow";
import { Examples, repository } from "./components/Examples";
import Magnet from "./components/react-bits/Magnet";
import { useReducedMotion } from "./useReducedMotion";
import { usePageMotion } from "./usePageMotion";
import { version } from "../package.json";

const installCommand = "python -m pip install -e .";
const analyzeCommand = [
  "python scripts/dbdep.py inspect --ddl examples/ecommerce/schema.sql --repo examples/ecommerce/app --out out/schema.dbdep.json",
  "python scripts/dbdep.py validate out/schema.dbdep.json --strict --json",
  "python scripts/dbdep.py render out/schema.dbdep.json --object public.customers.id --out out/dependencies.html",
].join("\n\n");

function MagneticAction({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <Magnet
      disabled={reduced || !finePointer}
      padding={10}
      magnetStrength={14}
      activeTransition="transform 160ms cubic-bezier(0.23, 1, 0.32, 1)"
      inactiveTransition="transform 200ms cubic-bezier(0.23, 1, 0.32, 1)"
    >
      {children}
    </Magnet>
  );
}

function CopyButton({
  text,
  label,
  c,
}: {
  text: string;
  label: string;
  c: Copy;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 3000);
  };
  return (
    <button
      type="button"
      className="copy-button mono"
      onClick={copy}
      aria-label={label}
    >
      <span aria-live="polite">{c.copy[state]}</span>
      <svg viewBox="0 0 20 20" aria-hidden="true" fill="none">
        <rect
          x="7"
          y="7"
          width="9"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M12 4H5a2 2 0 0 0-2 2v7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function Brand({ c }: { c: Copy }) {
  return (
    <a className="brand" href="#" aria-label={c.home}>
      <Mark />
      <span>
        whetstone<span className="brand-divider">/</span>
        <strong>dbdep</strong>
      </span>
    </a>
  );
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [locale, setLocale] = useState<Locale>(() =>
    document.documentElement.lang === "es" ? "es" : "en",
  );
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const c = copies[locale];
  usePageMotion(root, reduced, locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = c.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", c.description);
  }, [locale, c]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#10141c" : "#f8fafc");
  }, [theme]);
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
  return (
    <div ref={root}>
      <a className="skip-link" href="#main">
        {c.skip}
      </a>
      <div className="reading-progress" aria-hidden="true" />
      <header className="site-header">
        <div className="header-inner">
          <Brand c={c} />
          <nav aria-label={c.nav.label}>
            <a href="#workflow">{c.nav.workflow}</a>
            <a href="#examples">{c.nav.examples}</a>
            <a href="#install">{c.nav.install}</a>
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
      <main id="main" tabIndex={-1}>
        <section className="hero section" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <span className="eyebrow mono">
              <i />
              {c.hero.eyebrow}
            </span>
            <h1 id="hero-heading">
              {c.hero.lead}
              <br />
              <span className="hero-accent">{c.hero.accent}</span>
              <br />
              <span className="hero-end">{c.hero.end}</span>
            </h1>
            <p className="hero-description">{c.hero.body}</p>
            <div className="hero-actions">
              <MagneticAction>
                <a className="button button-primary" href="#examples">
                  {c.hero.examples}
                  <Arrow diagonal />
                </a>
              </MagneticAction>
              <a className="text-link" href="#install">
                {c.hero.install}
                <Arrow />
              </a>
            </div>
            <p className="hero-footnote mono">{c.hero.foot}</p>
          </div>
          <ImpactStudy c={c} theme={theme} />
        </section>
        <div className="scope-strip section">
          {c.scope.map((item, index) => (
            <span key={index}>
              <svg viewBox="0 0 18 18" aria-hidden="true" fill="none">
                <path
                  d="m4 9 3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {item}
            </span>
          ))}
        </div>
        <section
          className="workflow section"
          id="workflow"
          tabIndex={-1}
          aria-labelledby="workflow-heading"
        >
          <div className="section-head" data-reveal>
            <div>
              <span className="eyebrow mono">{c.workflow.eyebrow}</span>
              <h2 id="workflow-heading">
                {c.workflow.lead}
                <br />
                <span className="muted">{c.workflow.accent}</span>
              </h2>
            </div>
            <p>{c.workflow.body}</p>
          </div>
          <AnalysisFlow c={c} reduced={reduced} />
          <a className="text-link workflow-skill" href="./docs/SKILL.md">
            {c.workflow.skill}
            <Arrow diagonal />
          </a>
        </section>
        <Examples c={c} />
        <section
          className="install section"
          id="install"
          tabIndex={-1}
          aria-labelledby="install-heading"
        >
          <div className="install-copy" data-reveal>
            <span className="eyebrow mono">{c.install.eyebrow}</span>
            <h2 id="install-heading">
              {c.install.lead}
              <br />
              <span className="muted">{c.install.accent}</span>
            </h2>
            <p>{c.install.body}</p>
            <ol className="install-steps">
              {c.install.steps.map((step, index) => (
                <li key={index}>
                  <span className="mono">0{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>
                      {step.body}
                      {index === 0 && (
                        <>
                          {" "}
                          <a href={repository}>
                            GitHub
                            <Arrow diagonal />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <details className="skill-folders">
              <summary>
                {c.install.folders}
                <span aria-hidden="true">+</span>
              </summary>
              <p>Codex</p>
              <code>~/.agents/skills/database-dependency-migration</code>
              <p>Claude Code</p>
              <code>~/.claude/skills/database-dependency-migration</code>
              <p>{c.install.folderNote}</p>
            </details>
          </div>
          <div className="terminal" data-reveal>
            <div className="terminal-bar">
              <div className="terminal-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <span className="mono">{c.install.root}</span>
            </div>
            <div className="terminal-block">
              <div className="code-label mono">
                <span>{c.install.install} / PYTHON 3.11+</span>
                <CopyButton
                  text={installCommand}
                  label={c.install.copyInstall}
                  c={c}
                />
              </div>
              <pre>
                <code>
                  <span className="terminal-prompt">$ </span>
                  {installCommand}
                </code>
              </pre>
            </div>
            <div className="terminal-block">
              <div className="code-label mono">
                <span>{c.install.commands}</span>
                <CopyButton
                  text={analyzeCommand}
                  label={c.install.copyCommands}
                  c={c}
                />
              </div>
              <pre data-lenis-prevent>
                <code>{analyzeCommand}</code>
              </pre>
            </div>
            <div className="terminal-footer mono">
              <i />
              {c.install.output} / out/dependencies.html
            </div>
          </div>
        </section>
        <section className="limits section" aria-labelledby="limits-heading">
          <div data-reveal>
            <span className="eyebrow mono">{c.limits.eyebrow}</span>
            <h2 id="limits-heading">
              {c.limits.lead}
              <br />
              <span className="muted">{c.limits.accent}</span>
            </h2>
            <a className="text-link" href="./docs/README.md">
              {c.limits.docs}
              <Arrow diagonal />
            </a>
          </div>
          <div className="limits-list" data-reveal>
            {c.limits.entries.map((entry, index) => (
              <article key={index}>
                <span className="mono">0{index + 1}</span>
                <div>
                  <h3>{entry.title}</h3>
                  <p>{entry.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer section">
        <div>
          <Brand c={c} />
          <p className="mono">
            {c.footer.line} · v{version}
          </p>
        </div>
        <div className="footer-links">
          <a href={repository}>
            {c.footer.source}
            <Arrow diagonal />
          </a>
          <a href="./docs/SKILL.md">
            {c.footer.skill}
            <Arrow diagonal />
          </a>
          <a href="./THIRD_PARTY_NOTICES.md">
            {c.footer.notices}
            <Arrow diagonal />
          </a>
        </div>
      </footer>
    </div>
  );
}
