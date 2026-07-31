import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

/**
 * The one header every OneGames page uses.
 *
 * The wordmark is always centred in the full page width and always the same
 * size. Back navigation is an icon-only circular arrow pinned to the left, the
 * same affordance OneRead uses — its label lives in `aria-label` rather than
 * on screen, so nothing competes with the wordmark.
 */
export function SiteHeader({
  back,
  backLabel = "Back to OneGames",
  trailing,
}: {
  /** Href for the back arrow. Omit on the homepage. */
  back?: string;
  backLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="site-header">
      {back && (
        <Link href={back} className="header-back" aria-label={backLabel}>
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M12 7H2M6 3L2 7l4 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      <BrandLogo />
      {trailing && <div className="header-trailing">{trailing}</div>}
    </header>
  );
}
