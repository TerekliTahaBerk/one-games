import Link from "next/link";

export function SimpleFooter({ tagline }: { tagline: string }) {
  return (
    <footer className="simple-footer">
      <p>{tagline}</p>
      <nav aria-label="Footer">
        <Link href="/about">About</Link>
        <Link href="/sudoku/archive">Archive</Link>
        <a href="https://www.oneread.email/">OneRead</a>
        <span>Privacy</span>
        <span>Terms</span>
      </nav>
    </footer>
  );
}
