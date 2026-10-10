"use client";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Arrow } from "./components/Icons";
import { ImpactStudy } from "./components/ImpactStudy";
import { AnalysisFlow } from "./components/AnalysisFlow";
import { Examples, repository } from "./components/Examples";
import Magnet from "./components/react-bits/Magnet";
import { CopyButton } from "./components/CopyButton";
import { useReducedMotion } from "./useReducedMotion";
import { useSitePreferences } from "./preferences-context";
import Link from "next/link";

const installCommand =
  "git clone https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer.git dbdep-skill-source\nmkdir -p .agents/skills\ncp -R dbdep-skill-source/skills/database-dependency-migration .agents/skills/";

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

export default function Home() {
  const { c, theme, completeNavigation } = useSitePreferences();
  useLayoutEffect(() => {
    completeNavigation(false);
  }, []);
  const reduced = useReducedMotion();
  return (
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
        <Link
          className="text-link workflow-skill"
          href="/docs/introduction/"
          scroll={false}
        >
          {c.workflow.skill}
          <Arrow diagonal />
        </Link>
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
              <span>{c.install.install}</span>
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
                text={c.install.prompt}
                label={c.install.copyCommands}
                c={c}
              />
            </div>
            <pre data-lenis-prevent>
              <code>{c.install.prompt}</code>
            </pre>
          </div>
          <div className="terminal-footer mono">
            <i />
            {c.install.output} / out/review.md
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
          <Link
            className="text-link"
            href="/docs/safety-limits/"
            scroll={false}
          >
            {c.limits.docs}
            <Arrow diagonal />
          </Link>
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
  );
}
