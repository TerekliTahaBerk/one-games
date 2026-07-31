import Link from "next/link";

/**
 * The one footer every OneGames page uses — homepage, access, pricing, game,
 * archive, about, privacy, and terms.
 *
 * Layout mirrors OneRead: a centred Fraunces-italic tagline, then a single row
 * of quiet links. Dot separators are shown from `sm` up and hidden on mobile,
 * where the links wrap instead. Each link keeps a 44px touch height.
 *
 * The archive is reached from the game itself, and the OneRead link sits at the
 * top of the homepage, so neither needs a seat here.
 */
const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function SiteFooter({ tagline = "One good game at a time." }: { tagline?: string }) {
  return (
    <footer className="site-footer">
      <p className="site-footer-tagline">{tagline}</p>
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
    </footer>
  );
}
