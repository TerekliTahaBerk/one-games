import Link from "next/link";

/**
 * The OneGames wordmark.
 *
 * Set in Fraunces at one fixed size — 24px on small screens, 28px from `sm` up
 * — so it never changes scale between the homepage, the access flow, the game,
 * and the legal pages. `SiteHeader` is responsible for centring it.
 */
export function BrandLogo({ href = "/" }: { href?: string | null }) {
  const mark = (
    <span className="brand-logo-mark" aria-hidden="true">
      OneGames
    </span>
  );

  if (href === null) {
    return (
      <span className="brand-logo">
        {mark}
        <span className="sr-only">OneGames</span>
      </span>
    );
  }

  return (
    <Link href={href} className="brand-logo" aria-label="OneGames — home">
      {mark}
    </Link>
  );
}
