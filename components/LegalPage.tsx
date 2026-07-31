import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Shared reading layout for the long-form legal pages, matching OneRead's.
 *
 * Unlike the rest of OneGames these are reference documents, not single-screen
 * moments — so the column is left-aligned and starts at the top rather than
 * being centred in the viewport. The shell around it is unchanged: the same
 * page padding, the same centred wordmark, the same footer.
 *
 * Children are written as plain semantic HTML (h2 / p / ul); the prose styling
 * lives on the wrapper so each document stays readable as markup.
 */
export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <SiteHeader back="/" />

      <main className="page-main is-legal">
        <article className="legal-article rise">
          <p className="eyebrow">Last updated {lastUpdated}</p>
          <h1>{title}</h1>
          <div className="legal-prose">{children}</div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
