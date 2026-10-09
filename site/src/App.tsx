import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import DotGrid from "./components/react-bits/DotGrid";
import Magnet from "./components/react-bits/Magnet";
import { useReducedMotion } from "./useReducedMotion";
import data from "./data/demos.json";
const BlurText = lazy(() => import("./components/react-bits/BlurText"));

gsap.registerPlugin(ScrollTrigger);
const repository =
  "https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer";
const installCommand = "python -m pip install -e .";
const analyzeCommand = [
  "python scripts/dbdep.py inspect --ddl examples/ecommerce/schema.sql --repo examples/ecommerce/app --out out/schema.dbdep.json",
  "python scripts/dbdep.py validate out/schema.dbdep.json --strict --json",
  "python scripts/dbdep.py render out/schema.dbdep.json --object public.customers.id --out out/dependencies.html",
].join("\n\n");

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function Mark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="11" height="11" rx="1" fill="currentColor" />
      <rect x="22" y="21" width="11" height="11" rx="1" fill="currentColor" />
      <path
        d="M13 9h14v12M7 15v12h15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

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

function Specimen() {
  const { specimen } = data;
  return (
    <div className="specimen" data-reveal>
      <div className="specimen-heading">
        <span className="mono">IMPACT STUDY / 001</span>
        <span className="live-label">
          <i /> Source-backed
        </span>
      </div>
      <div className="specimen-proposal">
        <span className="mono">PROPOSED CHANGE</span>
        <p>
          public.customers.id{" "}
          <span>
            {specimen.root.type} <span aria-label="to">→</span> uuid
          </span>
        </p>
      </div>
      <div className="specimen-graph">
        <DotGrid
          dotSize={2}
          gap={19}
          baseColor="#d9dccb"
          activeColor="#8ea580"
          proximity={80}
          speedTrigger={800}
          shockRadius={60}
          shockStrength={0.3}
          returnDuration={0.6}
        />
        <svg
          className="dependency-lines"
          viewBox="0 0 580 320"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="dependency-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 10 5 0 10z" fill="#7e9673" />
            </marker>
          </defs>
          {[63, 160, 257].map((y) => (
            <path
              key={y}
              className="trace"
              d={`M344 ${y} C275 ${y} 280 160 236 160`}
              fill="none"
              stroke="#7e9673"
              strokeWidth="1.5"
              markerEnd="url(#dependency-arrow)"
            />
          ))}
          <circle cx="236" cy="160" r="4" fill="#244b3b" />
        </svg>
        <div className="graph-root">
          <span className="node-kind mono">COLUMN / ROOT</span>
          <strong>{specimen.root.name}</strong>
          <span className="mono">public · {specimen.root.status}</span>
        </div>
        <div className="graph-consumers">
          {specimen.consumers.map((node) => (
            <div
              className="graph-node"
              key={node.id}
              title={`${node.id}\n${node.edgeKind} (${node.status})`}
            >
              <span className="node-kind mono">{node.kind}</span>
              <strong>{node.name}</strong>
              <span className="node-dot" />
            </div>
          ))}
        </div>
      </div>
      <div className="specimen-stats">
        <div>
          <strong>{specimen.direct.toString().padStart(2, "0")}</strong>
          <span>direct dependents</span>
        </div>
        <div>
          <strong>{specimen.affected.toString().padStart(2, "0")}</strong>
          <span>potentially affected</span>
        </div>
        <span className="mono specimen-note">
          SELECTED REVERSE PATHS
          <br />
          ARROWS POINT TO DEPENDENCIES
        </span>
      </div>
      <p className="specimen-footnote">
        From the shipped ecommerce model. Potential impact requires review.
      </p>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 3000);
  };
  return (
    <>
      <button className="copy-button mono" onClick={copy} aria-label={label}>
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Select to copy"
            : "Copy"}
        <svg viewBox="0 0 20 20" aria-hidden="true" fill="none">
          <rect
            x="7"
            y="7"
            width="9"
            height="10"
            rx="1"
            stroke="currentColor"
          />
          <path d="M12 7V3H3v10h4" stroke="currentColor" />
        </svg>
      </button>
      <span className="sr-only" role="status">
        {state === "copied"
          ? "Command copied."
          : state === "failed"
            ? "Clipboard unavailable. Select the displayed command to copy it."
            : ""}
      </span>
    </>
  );
}

function DemoExplorer() {
  const [selected, setSelected] = useState(0);
  const demo = data.demos[selected];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const keydown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % data.demos.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + data.demos.length) % data.demos.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = data.demos.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabRefs.current[next]?.focus();
  };
  return (
    <section
      className="examples section"
      id="examples"
      tabIndex={-1}
      aria-labelledby="examples-heading"
    >
      <div className="section-head" data-reveal>
        <div>
          <span className="eyebrow mono">02 / THE EVIDENCE</span>
          <h2 id="examples-heading">
            Explore the dependencies.
            <br />
            <span className="muted">Follow the evidence.</span>
          </h2>
        </div>
        <p>
          Three reproducible scenarios.
          <br />
          Real reports generated by the CLI.
          <br />
          Search, select an object, and trace its impact.
        </p>
      </div>
      <div className="demo-shell" data-reveal>
        <div
          className="demo-tabs"
          role="tablist"
          aria-label="Generated example reports"
        >
          {data.demos.map((item, index) => (
            <button
              type="button"
              key={item.slug}
              role="tab"
              id={`tab-${item.slug}`}
              aria-controls="demo-panel"
              aria-selected={selected === index}
              tabIndex={selected === index ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => keydown(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
            >
              <span className="mono">0{index + 1}</span>
              {item.title}
              <span className="tab-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </div>
        <div
          id="demo-panel"
          role="tabpanel"
          aria-labelledby={`tab-${demo.slug}`}
        >
          <div className="demo-toolbar">
            <div>
              <span className="status-tag mono">{demo.nodes} OBJECTS</span>
              <span className="status-tag mono">{demo.edges} EDGES</span>
              <span className="status-tag unknown-tag mono">
                {demo.unknowns} UNKNOWN GAPS
              </span>
            </div>
            <a
              className="text-link"
              href={`./demos/${demo.slug}/report.html`}
              target="_blank"
              rel="noreferrer"
            >
              Open full report <Arrow diagonal />
            </a>
          </div>
          <div className="viewer-frame" data-lenis-prevent>
            <iframe
              key={demo.slug}
              src={`./demos/${demo.slug}/report.html`}
              title={`${demo.title} dependency report`}
              sandbox="allow-scripts allow-downloads"
              loading="lazy"
            />
          </div>
          <div className="demo-caption">
            <p>{demo.description}</p>
            <a
              className="mono"
              href={`./demos/${demo.slug}/model.dbdep.json`}
              download
            >
              Download source model <Arrow />
            </a>
          </div>
          <p className="demo-limitation">
            <span className="mono">COVERAGE NOTE</span>
            {demo.limitation}
          </p>
        </div>
      </div>
      <div className="evidence-key">
        <span className="mono">READ THE CONFIDENCE</span>
        <span>
          <i className="key-observed" />
          Observed <small>catalog metadata</small>
        </span>
        <span>
          <i className="key-parsed" />
          Parsed <small>AST evidence</small>
        </span>
        <span>
          <i className="key-inferred" />
          Inferred <small>unproven</small>
        </span>
        <span>
          <i className="key-unknown" />
          Unknown <small>missing or unsupported</small>
        </span>
      </div>
    </section>
  );
}

function App() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      duration: 0.85,
      smoothWheel: true,
      anchors: false,
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (seconds: number) => lenis.raf(seconds * 1000);
    gsap.ticker.add(tick);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        // Content is visible in CSS. Only in-view sections receive a short lift.
        gsap.from(element, {
          y: 14,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: { trigger: element, start: "top 90%", once: true },
        });
      });
      gsap.to(".reading-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: true },
      });
      gsap.from(".trace", {
        strokeDasharray: 240,
        strokeDashoffset: 240,
        duration: 1.1,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: ".specimen", start: "top 90%", once: true },
      });
    }, root);
    const handleAnchor = (event: MouseEvent) => {
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
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      if (
        !anchor ||
        !root.current?.contains(anchor) ||
        anchor.hasAttribute("download")
      )
        return;
      const href = anchor.getAttribute("href")!;
      const target =
        href === "#"
          ? document.documentElement
          : document.getElementById(href.slice(1));
      if (!target) return;
      if (event.detail === 0) {
        // Finish decorative reveals before keyboard navigation. Native anchors
        // update the hash and focus; the immediate jump also cancels Lenis inertia.
        const reveals = Array.from(target.querySelectorAll("[data-reveal]"));
        if (target.matches("[data-reveal]")) reveals.push(target);
        gsap.getTweensOf(reveals).forEach((tween) => tween.progress(1));
        lenis.scrollTo(target, { immediate: true });
        return;
      }
      event.preventDefault();
      history.pushState(null, "", href);
      lenis.scrollTo(target, {
        onComplete: () => target.focus({ preventScroll: true }),
      });
    };
    document.addEventListener("click", handleAnchor);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) refresh();
    });
    return () => {
      alive = false;
      window.removeEventListener("load", refresh);
      document.removeEventListener("click", handleAnchor);
      context.revert();
      gsap.ticker.remove(tick);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, [reduced]);

  return (
    <div ref={root}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="reading-progress" aria-hidden="true" />
      <header className="site-header">
        <a
          className="brand"
          href="#"
          aria-label="Whetstone database dependency migration home"
        >
          <Mark />
          <span>
            whetstone<span className="brand-divider">/</span>
            <strong>dbdep</strong>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#workflow">Workflow</a>
          <a href="#examples">Examples</a>
          <a href="#install">Install</a>
          <a
            className="repo-link"
            href={repository}
            target="_blank"
            rel="noreferrer"
          >
            GitHub <Arrow diagonal />
          </a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero section" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <div className="eyebrow mono">
              <i /> AN AGENT SKILL FOR POSTGRESQL
            </div>
            <h1 id="hero-heading">
              <Suspense
                fallback={<span className="blur-text">Know what breaks.</span>}
              >
                <BlurText
                  className="blur-text"
                  text="Know what breaks."
                  delay={40}
                  direction="bottom"
                  animationFrom={{ filter: "blur(3px)", opacity: 1, y: 7 }}
                  animationTo={[{ filter: "blur(0px)", opacity: 1, y: 0 }]}
                  stepDuration={0.5}
                />
              </Suspense>
              Before you
              <br />
              <span className="hero-green">migrate.</span>
            </h1>
            <p className="hero-description">
              Trace schema changes through foreign keys, views, and potential
              SQL consumers. Build dependency graphs and review migration
              hazards with the evidence attached.
            </p>
            <div className="hero-actions">
              <MagneticAction>
                <a className="button button-primary" href="#examples">
                  Explore the examples <Arrow diagonal />
                </a>
              </MagneticAction>
              <a className="text-link" href="#install">
                Install the skill <Arrow />
              </a>
            </div>
            <p className="hero-footnote mono">
              LOCAL ANALYSIS. REVIEW-ONLY PLANS.
            </p>
          </div>
          <Specimen />
        </section>
        <div className="scope-strip section">
          <span className="mono">
            BUILT FOR THE REVIEW
            <br />
            BEFORE THE CHANGE
          </span>
          <p>
            PostgreSQL <span className="muted">DDL + catalogs</span>
          </p>
          <p>
            SQL repositories <span className="muted">potential consumers</span>
          </p>
          <p>
            Local artifacts{" "}
            <span className="muted">no migration execution</span>
          </p>
        </div>
        <section
          className="workflow section"
          id="workflow"
          tabIndex={-1}
          aria-labelledby="workflow-heading"
        >
          <div className="section-head" data-reveal>
            <div>
              <span className="eyebrow mono">01 / THE WORKFLOW</span>
              <h2 id="workflow-heading">
                A schema change is
                <br />
                <span className="muted">a dependency question.</span>
              </h2>
            </div>
            <p>
              Give your agent a repeatable way to inspect
              <br className="desktop-break" /> the schema, trace reverse paths,
              and
              <br className="desktop-break" /> produce a plan for human review.
            </p>
          </div>
          <div className="workflow-grid">
            <article data-reveal>
              <div className="step-number mono">
                01<span>INSPECT</span>
              </div>
              <h3>Start with your sources.</h3>
              <p>
                Parse PostgreSQL DDL and simple SQL references, or use a
                supplied catalog snapshot. Store them in a versioned, validated
                JSON model.
              </p>
              <div className="step-code mono">
                schema.sql + app/*.sql
                <br />
                <span>↓</span>
                <br />
                schema.dbdep.json
              </div>
            </article>
            <article data-reveal>
              <div className="step-number mono">
                02<span>TRACE</span>
              </div>
              <h3>Follow the reverse edges.</h3>
              <p>
                Select a table or column. See direct and transitive dependents,
                inspect source evidence, and keep unknown coverage visible.
              </p>
              <div className="step-code mono">
                public.customers.id
                <br />
                <span>↓</span>
                <br />
                reverse dependency paths
              </div>
            </article>
            <article data-reveal>
              <div className="step-number mono">
                03<span>REVIEW</span>
              </div>
              <h3>Put a proposal in context.</h3>
              <p>
                Review SQL hazards and transaction boundaries. Export the
                findings and a phased plan for your team to assess before
                execution.
              </p>
              <div className="step-code mono">
                migration.sql + baseline
                <br />
                <span>↓</span>
                <br />
                findings + review-only plan
              </div>
            </article>
          </div>
          <div className="workflow-bottom">
            <span className="mono">ONE MODEL, MULTIPLE ARTIFACTS</span>
            <p>
              Interactive HTML <span>/</span> Markdown <span>/</span> Mermaid{" "}
              <span>/</span> DOT <span>/</span> JSON
            </p>
            <a className="text-link" href="./docs/SKILL.md">
              Read the skill <Arrow diagonal />
            </a>
          </div>
        </section>
        <DemoExplorer />
        <section
          className="install section"
          id="install"
          tabIndex={-1}
          aria-labelledby="install-heading"
        >
          <div className="install-copy" data-reveal>
            <span className="eyebrow mono">03 / YOUR WORKSPACE</span>
            <h2 id="install-heading">
              Give your agent
              <br />
              the dependency map.
            </h2>
            <p>
              Use this repository as an Agent Skill, or run the Python toolkit
              directly. Your inputs and reports stay in your workspace.
            </p>
            <ol className="install-steps">
              <li>
                <span className="mono">01</span>
                <div>
                  <strong>Get the repository.</strong>
                  <p>
                    Clone or download the checkout from{" "}
                    <a href={repository}>
                      GitHub <span aria-hidden="true">↗</span>
                    </a>
                    .
                  </p>
                </div>
              </li>
              <li>
                <span className="mono">02</span>
                <div>
                  <strong>Install the Python toolkit.</strong>
                  <p>
                    Run the install command from the repository root. Python
                    3.11+ is required.
                  </p>
                </div>
              </li>
              <li>
                <span className="mono">03</span>
                <div>
                  <strong>Connect the skill to your agent.</strong>
                  <p>
                    Copy or symlink the repository into your agent's skill
                    directory, then restart or reload the agent.
                  </p>
                </div>
              </li>
            </ol>
            <details>
              <summary>
                Skill folder locations <span aria-hidden="true">+</span>
              </summary>
              <p>Codex</p>
              <code>~/.agents/skills/database-dependency-migration</code>
              <p>Claude Code</p>
              <code>~/.claude/skills/database-dependency-migration</code>
              <p>
                Project-level skill directories also work. See the repository
                README for setup details.
              </p>
            </details>
          </div>
          <div className="terminal" data-reveal>
            <div className="terminal-bar">
              <div className="terminal-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <span className="mono">FROM THE REPOSITORY ROOT</span>
              <span className="mono">PYTHON 3.11+</span>
            </div>
            <div className="terminal-block">
              <div className="code-label mono">
                <span>INSTALL</span>
                <CopyButton
                  text={installCommand}
                  label="Copy Python install command"
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
                <span>INSPECT → VALIDATE → RENDER</span>
                <CopyButton
                  text={analyzeCommand}
                  label="Copy inspect validate and render commands"
                />
              </div>
              <pre>
                <code>{analyzeCommand}</code>
              </pre>
            </div>
            <div className="terminal-footer mono">
              <i /> OUTPUT / out/dependencies.html
            </div>
          </div>
        </section>
        <section className="limits section" aria-labelledby="limits-heading">
          <div data-reveal>
            <span className="eyebrow mono">THE BOUNDARIES MATTER</span>
            <h2 id="limits-heading">
              Evidence first.
              <br />
              Certainty where it exists.
            </h2>
            <a className="text-link" href="./docs/README.md">
              Read coverage and limitations <Arrow diagonal />
            </a>
          </div>
          <div className="limits-list" data-reveal>
            <article>
              <span className="mono">01</span>
              <div>
                <h3>Analysis stays local.</h3>
                <p>
                  The webpage runs shipped examples. The toolkit writes local
                  artifacts and never applies migrations. Live discovery
                  requires an explicit request and uses read-only catalog
                  queries.
                </p>
              </div>
            </article>
            <article>
              <span className="mono">02</span>
              <div>
                <h3>Unknown means unknown.</h3>
                <p>
                  Dynamic SQL, ORM queries, routine bodies, and nested column
                  scopes have partial or unknown coverage. DML and backfill
                  semantics are outside the hazard engine.
                </p>
              </div>
            </article>
            <article>
              <span className="mono">03</span>
              <div>
                <h3>A path is a reason to investigate.</h3>
                <p>
                  Reverse dependency paths show potential impact. They do not
                  prove execution failure, an exact CASCADE deletion closure, or
                  production downtime. The viewer caps its display at 350 nodes,
                  40 paths, and 16 steps per path. CLI artifacts retain the full
                  analysis.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="closing section" data-reveal>
          <span className="eyebrow mono">BEFORE YOUR NEXT MIGRATION</span>
          <h2>Make the dependencies visible.</h2>
          <MagneticAction>
            <a className="button button-primary" href="#examples">
              Explore a generated report <Arrow diagonal />
            </a>
          </MagneticAction>
        </section>
      </main>
      <footer className="site-footer section">
        <a className="brand" href="#">
          <Mark />
          <span>
            whetstone<span className="brand-divider">/</span>
            <strong>dbdep</strong>
          </span>
        </a>
        <p className="mono">DATABASE DEPENDENCY MIGRATION · v0.1.0</p>
        <div>
          <a href={repository}>
            Source <Arrow diagonal />
          </a>
          <a href="./docs/SKILL.md">
            Skill definition <Arrow diagonal />
          </a>
          <a href="./THIRD_PARTY_NOTICES.md">
            Third-party notices <Arrow diagonal />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
