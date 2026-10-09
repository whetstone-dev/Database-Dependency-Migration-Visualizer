import data from "../data/demos.json";
import type { Copy } from "../i18n";
import { Arrow } from "./Icons";
import { assetPath } from "../paths";

export const repository =
  "https://github.com/whetstone-dev/Database-Dependency-Migration-Visualizer";

export function Examples({ c }: { c: Copy }) {
  return (
    <section
      className="examples section"
      id="examples"
      tabIndex={-1}
      aria-labelledby="examples-heading"
    >
      <div className="section-head" data-reveal>
        <div>
          <span className="eyebrow mono">{c.examples.eyebrow}</span>
          <h2 id="examples-heading">
            {c.examples.lead}
            <br />
            <span className="muted">{c.examples.accent}</span>
          </h2>
        </div>
        <p>{c.examples.body}</p>
      </div>
      <div className="example-grid">
        {data.demos.map((demo, index) => {
          const card = c.examples.cards[index];
          return (
            <article className="example-card" key={demo.slug} data-reveal>
              <div className="example-category mono">
                <span>0{index + 1}</span>
                {card.category}
                <Arrow diagonal />
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <div className="example-question">
                <code>{card.question}</code>
              </div>
              <div className="example-actions">
                <a
                  className="button button-secondary"
                  href={assetPath(`demos/${demo.slug}/report.html`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.examples.open}
                  <Arrow diagonal />
                </a>
                <a
                  className="text-link source-link"
                  href={`${repository}/tree/main/examples/${demo.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.examples.source}
                  <Arrow diagonal />
                </a>
              </div>
              <p className="example-limitation">{card.limitation}</p>
            </article>
          );
        })}
      </div>
      <p className="examples-note">{c.examples.note}</p>
    </section>
  );
}
