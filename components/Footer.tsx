import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-top">
        <div>
          <Link className="wordmark" href="/">One<span>Games</span></Link>
          <p>One good game at a time.</p>
        </div>
        <div className="footer-links">
          <Link href="/about">About</Link>
          <a href="https://www.oneread.email/">OneRead</a>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} OneGames</span>
        <span>Made for a few thoughtful minutes.</span>
      </div>
    </footer>
  );
}
