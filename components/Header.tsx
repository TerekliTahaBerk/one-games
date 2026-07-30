import Link from "next/link";

export function Header() {
  return (
    <header className="ecosystem-header">
      <Link href="/" className="back-link" aria-label="Back to OneGames">← <span>Back</span></Link>
      <Link className="brand-logo" href="/" aria-label="OneGames home">
        <span>One</span><em>Games</em>
      </Link>
    </header>
  );
}
