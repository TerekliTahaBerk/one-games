import Link from "next/link";

/**
 * The one footer every OneGames page uses — homepage, access, pricing, game,
 * archive, about, privacy, and terms.
 *
 * Layout mirrors OneRead: a centred Fraunces-italic tagline, then a single row
 * of quiet links. Dot separators are shown from `sm` up and hidden on mobile,
 * where the links wrap instead. Each link keeps a 44px touch height.
 *
 * The archive is reached from the game itself, the OneRead link sits at the
 * top of the homepage, and About is a text link in the homepage header — so
 * none of the three need a seat here too.
 */
const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function SiteFooter({
  tagline = "One good game at a time.",
  /** The homepage's expanded statement, shown under the tagline. Omitted elsewhere. */
  manifesto,
}: {
  tagline?: string;
  manifesto?: string;
}) {
  return (
    <footer className="site-footer">
      <p className="site-footer-tagline">{tagline}</p>
      {manifesto && <p className="site-footer-manifesto">{manifesto}</p>}
      <nav className="site-footer-nav" aria-label="Footer">
        {LINKS.map((link, index) => (
          <span className="footer-link-group" key={link.href}>
            {index > 0 && (
              <i className="footer-separator" aria-hidden="true">
                ·
              </i>
            )}
            <Link href={link.href}>
              <span>{link.label}</span>
            </Link>
          </span>
        ))}
      </nav>
      <p className="site-footer-credit">
        digital products, thoughtfully crafted. —{" "}
        <a href="https://yula.co" rel="noreferrer" className="link-underline">
          yula.co
        </a>{" "}
        💜
      </p>
    </footer>
  );
}
