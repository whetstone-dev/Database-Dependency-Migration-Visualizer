import { useState } from "react";
import type { Copy } from "../i18n";
import data from "../data/demos.json";
import DotGrid from "./react-bits/DotGrid";

type Selection = number | "root" | null;

export function ImpactStudy({
  c,
  theme,
}: {
  c: Copy;
  theme: "light" | "dark";
}) {
  const [hover, setHover] = useState<Selection>(null);
  const [focus, setFocus] = useState<Selection>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const active = hover ?? focus ?? selection;
  const { specimen } = data;
  const nodeProps = (value: number | "root") => ({
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") setHover(value);
    },
    onPointerLeave: () => setHover(null),
    onFocus: () => {
      setHover(null);
      setFocus(value);
    },
    onBlur: () => setFocus(null),
    onClick: () =>
      setSelection((current) => (current === value ? null : value)),
    "aria-pressed": selection === value,
  });
  const selected =
    typeof active === "number" ? specimen.consumers[active] : null;
  return (
    <div className="specimen" data-reveal>
      <div className="specimen-heading">
        <span className="mono">{c.study.label}</span>
        <span className="live-label">
          <i />
          {c.study.backed}
        </span>
      </div>
      <div className="specimen-proposal">
        <span className="mono">{c.study.proposal}</span>
        <p>
          <code>public.customers.id</code>
          <span>
            <code>{specimen.root.type}</code>
            <span aria-hidden="true">→</span>
            <code>uuid</code>
          </span>
        </p>
      </div>
      <div className="specimen-graph" data-selected={active !== null}>
        <DotGrid
          dotSize={2}
          gap={21}
          baseColor={theme === "dark" ? "#343e50" : "#dfe5ed"}
          activeColor={theme === "dark" ? "#668adb" : "#abc2f0"}
          proximity={80}
          speedTrigger={800}
          shockRadius={60}
          shockStrength={0.3}
          returnDuration={0.6}
        />
        <svg
          className="dependency-lines"
          viewBox="0 0 580 320"
          preserveAspectRatio="none"
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
              <path d="M0 0 10 5 0 10z" fill="context-stroke" />
            </marker>
          </defs>
          {[63, 160, 257].map((y, index) => (
            <path
              key={y}
              className="trace"
              data-active={active === "root" || active === index}
              data-edge-id={specimen.consumers[index].edgeId}
              d={`M348 ${y} C282 ${y} 287 160 238 160`}
              fill="none"
              markerEnd="url(#dependency-arrow)"
            />
          ))}
          <circle cx="238" cy="160" r="4" className="root-junction" />
        </svg>
        <button
          type="button"
          className="graph-root"
          data-active={active !== null}
          {...nodeProps("root")}
        >
          <span className="node-kind mono">{c.study.root}</span>
          <strong>{specimen.root.name}</strong>
          <span className="node-meta mono">public · {c.study.parsed}</span>
        </button>
        <div className="graph-consumers">
          {specimen.consumers.map((node, index) => (
            <button
              type="button"
              className="graph-node"
              key={node.id}
              data-active={active === "root" || active === index}
              title={`${node.id}\n${node.edgeKind} (${node.status})`}
              {...nodeProps(index)}
            >
              <span className="node-kind mono">
                {node.kind === "column" ? c.study.column : c.study.view}
              </span>
              <strong>{node.name}</strong>
              <span className="node-dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <p className="trace-caption" aria-live="polite">
        {selected ? (
          <>
            <code>{selected.name}</code> <span aria-hidden="true">→</span>{" "}
            <code>{specimen.root.name}</code>
            <span className="trace-caption-kind">
              {selected.edgeKind === "foreign_key" ? c.study.fk : c.study.query}{" "}
              · {c.study.parsed}
            </span>
          </>
        ) : (
          c.study.hint
        )}
      </p>
      <div className="specimen-stats">
        <div>
          <strong>{specimen.direct.toString().padStart(2, "0")}</strong>
          <span>{c.study.direct}</span>
        </div>
        <div>
          <strong>{specimen.affected.toString().padStart(2, "0")}</strong>
          <span>{c.study.affected}</span>
        </div>
        <p>{c.study.all}</p>
      </div>
      <p className="specimen-footnote">{c.study.foot}</p>
    </div>
  );
}
