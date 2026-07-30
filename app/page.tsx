import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { GameFamily } from "@/components/GameFamily";
import { SimpleFooter } from "@/components/SimpleFooter";

export default function HomePage() {
  return (
    <main className="oneread-home">
      <header className="oneread-topbar reveal-unit">
        <BrandLogo />
        <Link href="/about" className="quiet-icon-link" aria-label="About OneGames" title="About">
          <span aria-hidden="true">i</span>
        </Link>
      </header>

      <section className="oneread-main">
        <div className="home-copy">
          <p className="one-eyebrow reveal-unit reveal-1">OneGames</p>
          <h1 className="reveal-unit reveal-2">One thoughtful game at a time.</h1>
          <p className="reveal-unit reveal-3">
            A small daily collection for your attention—not an endless feed.
            One new Easy, Medium, and Hard chapter every day.
          </p>
          <Link href="/play" className="pill-primary reveal-unit reveal-4">
            Play OneGames
          </Link>
          <p className="price-note reveal-unit reveal-4">
            All daily games · $1 per month · Cancel anytime
          </p>
        </div>

        <GameFamily />
      </section>

      <SimpleFooter tagline="One good game at a time." />
    </main>
  );
}
