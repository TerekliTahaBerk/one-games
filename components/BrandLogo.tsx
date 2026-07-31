import Link from "next/link";
import { BrandCharacter } from "./BrandCharacter";

/**
 * The OneGames lockup: the wordmark in Fraunces with the character standing to
 * its right, the same arrangement OneRead uses.
 *
 * The whole lockup is what gets centred by `SiteHeader` — not the text alone —
 * and it is one fixed size everywhere, so it never changes scale between the
 * homepage, the access flow, the game, and the legal pages.
 */
export function BrandLogo({ href = "/" }: { href?: string | null }) {
  const mark = (
    <>
      <span className="brand-logo-mark" aria-hidden="true">
        OneGames
      </span>
      <BrandCharacter />
    </>
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
