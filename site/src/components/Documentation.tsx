import { useEffect, useRef, useState } from "react";
import {
  docsCopies,
  topicOrder,
  type DocSection,
  type TopicSlug,
} from "../docs";
import type { Copy, Locale } from "../i18n";
import { Arrow, StageIcon } from "./Icons";
import { CopyButton } from "./CopyButton";
import { repository } from "./Examples";
import { version } from "../../package.json";

const groups: TopicSlug[][] = [
  ["introduction", "installation", "quickstart"],
  ["good-requests"],
  ["command-reference", "confidence", "safety-limits"],
];

function TopicIcon({ index }: { index: number }) {
  if (index === 6) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <StageIcon index={[3, 0, 2, 3, 0, 1][index]} />;
}

function Section({ section, c }: { section: DocSection; c: Copy }) {
  return (
    <section className="docs-prose-section">
      <h2>{section.title}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.bullets && (
        <ul>
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {section.code?.map((block) => (
        <div className="docs-code" key={block.label}>
          <div className="docs-code-bar">
            <span className="mono">{block.label}</span>
            <CopyButton text={block.value} label={block.copyLabel} c={c} />
          </div>
          <pre tabIndex={0} aria-label={block.label}>
            <code>{block.value}</code>
          </pre>
        </div>
      ))}
      {section.table && (
        <div
          className="docs-table-wrap"
          tabIndex={0}
          role="region"
          aria-label={section.title}
        >
          <table>
            <thead>
              <tr>
                {section.table.headings.map((heading) => (
                  <th key={heading} scope="col">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th scope="row" key={index}>
                        {cell}
                      </th>
                    ) : (
                      <td key={index}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.callout && (
        <aside className="docs-callout">
          <TopicIcon index={6} />
          <p>{section.callout}</p>
        </aside>
      )}
    </section>
  );
}

export function Documentation({
  slug,
  locale,
  c,
}: {
  slug: string;
  locale: Locale;
  c: Copy;
}) {
  const d = docsCopies[locale];
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const topic = topicOrder.includes(slug as TopicSlug)
    ? d.topics[slug as TopicSlug]
    : null;
  const index = topicOrder.indexOf(slug as TopicSlug);
  const previous = topicOrder[index - 1];
  const next = topicOrder[index + 1];
  useEffect(() => setExpanded(false), [slug]);
  return (
    <div className="docs-layout section">
      <aside className="docs-sidebar" data-expanded={expanded}>
        <button
          ref={toggle}
          className="docs-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="docs-contents"
          onClick={() => setExpanded((value) => !value)}
        >
          <span>{d.browse}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" fill="none">
            <path
              d="m5 8 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          id="docs-contents"
          className="docs-contents"
          onKeyDown={(event) => {
            if (event.key === "Escape" && expanded) {
              event.preventDefault();
              setExpanded(false);
              toggle.current?.focus();
            }
          }}
        >
          <div className="docs-sidebar-heading">
            <span>{d.title}</span>
            <span className="mono">v{version}</span>
          </div>
          <nav
            aria-label={d.navigation}
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest("a"))
                setExpanded(false);
            }}
          >
            <a
              href="#/docs"
              className="docs-overview-link"
              aria-current={slug === "" ? "page" : undefined}
            >
              {d.overview}
            </a>
            {groups.map((group, groupIndex) => (
              <div className="docs-nav-group" key={groupIndex}>
                <p className="mono">{d.groups[groupIndex]}</p>
                {group.map((item) => (
                  <a
                    href={`#/docs/${item}`}
                    key={item}
                    aria-current={slug === item ? "page" : undefined}
                  >
                    {d.topics[item].title}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </aside>
      <main className="docs-main" id="main" tabIndex={-1}>
        <div className="docs-breadcrumb mono">
          <a href="#/docs">{d.title}</a>
          <span aria-hidden="true">/</span>
          <span>{topic?.title ?? d.overview}</span>
        </div>
        {slug === "" ? (
          <>
            <div className="docs-intro">
              <span className="eyebrow mono">{d.eyebrow}</span>
              <h1 id="docs-heading" tabIndex={-1}>
                {d.title}
              </h1>
              <p>{d.body}</p>
            </div>
            <div className="docs-topics-heading">
              <h2>{d.topicsTitle}</h2>
              <span className="mono">07 / {d.overview}</span>
            </div>
            <div className="docs-card-grid">
              {topicOrder.map((item, topicIndex) => (
                <a className="docs-card" href={`#/docs/${item}`} key={item}>
                  <div className="docs-card-top">
                    <span
                      className="docs-topic-icon"
                      data-color={topicIndex % 3}
                    >
                      <TopicIcon index={topicIndex} />
                    </span>
                    <Arrow />
                  </div>
                  <h3>{d.topics[item].title}</h3>
                  <p>{d.topics[item].description}</p>
                </a>
              ))}
            </div>
            <aside className="docs-start">
              <div>
                <h2>{d.startTitle}</h2>
                <p>{d.startBody}</p>
              </div>
              <a className="text-link" href="#/docs/quickstart">
                {d.startLink}
                <Arrow />
              </a>
            </aside>
          </>
        ) : topic ? (
          <article className="docs-article">
            <div className="docs-intro">
              <span className="eyebrow mono">
                {
                  d.groups[
                    groups.findIndex((group) =>
                      group.includes(slug as TopicSlug),
                    )
                  ]
                }
              </span>
              <h1 id="docs-heading" tabIndex={-1}>
                {topic.title}
              </h1>
              <p>{topic.description}</p>
            </div>
            <div className="docs-prose">
              {topic.sections.map((section) => (
                <Section key={section.title} section={section} c={c} />
              ))}
            </div>
            <a
              className="text-link docs-source"
              href={`${repository}/blob/main/${topic.reference}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.source}
              <Arrow diagonal />
            </a>
            <nav
              className="docs-pagination"
              aria-label={
                locale === "en"
                  ? "Related documentation"
                  : "Documentación relacionada"
              }
            >
              {previous ? (
                <a href={`#/docs/${previous}`}>
                  <span className="mono">{d.previous}</span>
                  <strong>{d.topics[previous].title}</strong>
                </a>
              ) : (
                <span />
              )}
              {next && (
                <a href={`#/docs/${next}`}>
                  <span className="mono">{d.next}</span>
                  <strong>
                    {d.topics[next].title}
                    <Arrow />
                  </strong>
                </a>
              )}
            </nav>
          </article>
        ) : (
          <div className="docs-intro">
            <h1 id="docs-heading" tabIndex={-1}>
              {d.missingTitle}
            </h1>
            <p>{d.missingBody}</p>
            <a className="text-link docs-back" href="#/docs">
              {d.back}
              <Arrow />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
