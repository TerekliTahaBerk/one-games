import Link from "next/link";

export function SimpleFooter({ tagline }: { tagline: string }) {
  return (
    <footer className="simple-footer">
      <p>{tagline}</p>
      <nav aria-label="Footer">
        <Link href="/about">About</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/sudoku/archive">Archive</Link>
        <a href="https://www.oneread.email/">OneRead</a>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
