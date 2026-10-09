"use client";
import Link from "next/link";
import { useSitePreferences } from "../preferences-context";
import { docsCopies } from "../docs";
export default function NotFound() {
  const { locale } = useSitePreferences();
  const d = docsCopies[locale];
  return (
    <main id="main" className="section docs-intro" tabIndex={-1}>
      <h1>{d.missingTitle}</h1>
      <p>{d.missingBody}</p>
      <Link href="/docs/">{d.back}</Link>
    </main>
  );
}
