import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Copy } from "../i18n";
import { StageIcon } from "./Icons";

export function AnalysisFlow({ c, reduced }: { c: Copy; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const seen = useRef(false);
  const [step, setStep] = useState(7);
  const [playing, setPlaying] = useState(false);
  const play = useCallback(
    (instant = false) => {
      if (instant || reduced || document.hidden) {
        timeline.current?.pause();
        setStep(7);
        setPlaying(false);
        return;
      }
      setStep(0);
      setPlaying(true);
      timeline.current?.restart();
    },
    [reduced],
  );
  useEffect(() => {
    if (reduced) {
      setStep(7);
      setPlaying(false);
      return;
    }
    // Explanation, once on entry. A short signal links sources to generated outputs.
    // Replaying cancels the previous run; hidden/offscreen diagrams stop immediately.
    const animation = gsap.timeline({
      paused: true,
      onComplete: () => setPlaying(false),
    });
    for (let index = 1; index <= 7; index++)
      animation.call(() => setStep(index), [], (index - 1) * 0.34);
    timeline.current = animation;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seen.current) {
          seen.current = true;
          play(document.documentElement.dataset.input === "keyboard");
        } else if (!entry.isIntersecting && animation.isActive()) play(true);
      },
      { threshold: 0.25 },
    );
    if (root.current) observer.observe(root.current);
    const stop = () => {
      if (document.hidden) play(true);
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      observer.disconnect();
      animation.kill();
      timeline.current = null;
      document.removeEventListener("visibilitychange", stop);
    };
  }, [reduced, play]);
  return (
    <div
      className="flow-wrapper"
      ref={root}
      data-playing={playing}
      data-instant={reduced || !playing}
    >
      <div
        className="analysis-flow"
        aria-label={c.workflow.lead + " " + c.workflow.accent}
      >
        {c.workflow.stages.map((stage, index) => (
          <Fragment key={index}>
            <article
              className="flow-stage"
              data-on={step > index * 2}
              data-stage={index}
            >
              <div className="flow-stage-top">
                <span className="mono">
                  0{index + 1} / {stage.key}
                </span>
                <i aria-hidden="true" />
              </div>
              <div className="flow-icon">
                <StageIcon index={index} />
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.body}</p>
              <code>{stage.file}</code>
            </article>
            {index < 3 && (
              <div
                className="flow-wire"
                data-on={step > index * 2 + 1}
                aria-hidden="true"
              >
                <span />
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <div className="flow-footer">
        <p>{c.workflow.foot}</p>
        <button
          type="button"
          className="replay-button"
          onClick={(event) => play(event.detail === 0)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 10a8 8 0 1 1 1 7M4 4v6h6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {c.workflow.replay}
        </button>
      </div>
    </div>
  );
}
