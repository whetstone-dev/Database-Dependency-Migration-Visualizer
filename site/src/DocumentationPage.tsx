"use client";
import { useEffect, useLayoutEffect } from "react";
import { Documentation } from "./components/Documentation";
import { docsCopies, topicOrder, type TopicSlug } from "./docs";
import { useSitePreferences } from "./preferences-context";

export default function DocumentationPage({ slug }: { slug: string }) {
  const { c, locale, completeNavigation } = useSitePreferences();
  useLayoutEffect(() => {
    completeNavigation(true);
  }, [slug]);
  useEffect(() => {
    const topic = topicOrder.includes(slug as TopicSlug)
      ? docsCopies[locale].topics[slug as TopicSlug]
      : null;
    document.title = `${topic?.title ?? docsCopies[locale].title} · dbdep`;
  }, [slug, locale]);
  return <Documentation slug={slug} locale={locale} c={c} />;
}
