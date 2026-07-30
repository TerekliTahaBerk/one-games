import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="OneGames home">
          One<span>Games</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Games</Link>
          <Link href="/sudoku/archive">Archive</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
