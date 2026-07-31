import Link from "next/link";

/**
 * The OneGames lockup — the wordmark with the character standing to its right,
 * the same arrangement (and the same rendered height) as OneRead's.
 *
 * It is supplied artwork rather than typesetting, so it ships as an image the
 * way OneRead's does. `SiteHeader` centres the whole lockup, and the height is
 * fixed at 28px / 34px so it never changes scale between routes.
 *
 * A plain `<img>` keeps the asset identical on both deploy targets: the Next.js
 * image optimiser and the Cloudflare Worker's image binding would each rewrite
 * it differently, and the file is already sized for its one use.
 */
export function BrandLogo({ href = "/" }: { href?: string | null }) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/onegames-logo.png"
      alt=""
      aria-hidden="true"
      width={1400}
      height={293}
      className="brand-logo-mark"
      draggable={false}
    />
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
