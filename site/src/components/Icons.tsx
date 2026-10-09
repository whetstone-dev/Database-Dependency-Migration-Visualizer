export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Mark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="11" height="11" rx="3" fill="currentColor" />
      <rect x="22" y="21" width="11" height="11" rx="3" fill="currentColor" />
      <path
        d="M13 9h14v12M7 15v12h15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function StageIcon({ index }: { index: number }) {
  const paths = [
    "M8 4H5v16h14V9l-5-5H8m6 0v5h5M8 13h8m-8 3h5",
    "M12 3 3 7.5 12 12l9-4.5L12 3Zm-9 9 9 4.5 9-4.5M3 16.5 12 21l9-4.5",
    "M5 5h5v5H5V5Zm9 9h5v5h-5v-5ZM10 7.5h6.5V14M7.5 10v6.5H14",
    "M7 3H4v18h16V8l-5-5H7m8 0v5h5M8 12h8m-8 4h5",
  ];
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[index]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
