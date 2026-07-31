import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

/**
 * The one header every OneGames page uses.
 *
 * The wordmark is always centred in the full page width and always the same
 * size; a back link or a quiet icon sits absolutely at the edges so it never
 * shifts the logo off centre.
 */
export function SiteHeader({
  back,
  backLabel = "Back",
  trailing,
}: {
  /** Href for the quiet back link on the left. Omit on the homepage. */
  back?: string;
  backLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="site-header">
      {back && (
        <Link href={back} className="header-back" aria-label={`${backLabel} to OneGames`}>
          <span aria-hidden="true">←</span>
          <span className="header-back-label">{backLabel}</span>
        </Link>
      )}
      <BrandLogo />
      {trailing && <div className="header-trailing">{trailing}</div>}
    </header>
  );
}
