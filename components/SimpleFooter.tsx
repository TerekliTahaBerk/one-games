import Link from "next/link";

export function SimpleFooter({ tagline }: { tagline: string }) {
  const links = [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/sudoku/archive", label: "Archive" },
  ];

  return (
    <footer className="simple-footer">
      <p>{tagline}</p>
      <nav aria-label="Footer">
        {links.map((link, index) => (
          <span className="footer-link-group" key={link.href}>
            {index > 0 && <i className="footer-separator" aria-hidden="true">·</i>}
            <Link href={link.href}><span>{link.label}</span></Link>
          </span>
        ))}
        <span className="footer-link-group">
          <i className="footer-separator" aria-hidden="true">·</i>
          <a href="https://www.oneread.email/"><span>OneRead</span></a>
        </span>
      </nav>
    </footer>
  );
}
