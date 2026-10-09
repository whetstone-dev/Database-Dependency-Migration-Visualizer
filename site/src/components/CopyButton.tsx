import { useEffect, useRef, useState } from "react";
import type { Copy } from "../i18n";

export function CopyButton({
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
