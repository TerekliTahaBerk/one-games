import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { GameFamily } from "@/components/GameFamily";
import { HomeReveal } from "@/components/HomeReveal";
import { SimpleFooter } from "@/components/SimpleFooter";

export default function HomePage() {
  return (
    <main className="oneread-home">
      <HomeReveal>
        <header className="oneread-topbar reveal-item">
          <BrandLogo />
          <Link href="/about" className="quiet-icon-link" aria-label="About OneGames" title="About OneGames">
            <span className="quiet-grid-icon" aria-hidden="true"><i /><i /><i /><i /></span>
          </Link>
        </header>

        <section className="oneread-main">
          <div className="home-copy">
            <h1 className="reveal-item reveal-item-2">One thoughtful game at a time.</h1>
            <p className="reveal-item reveal-item-3">
              Three fresh chapters every day—Easy, Medium, and Hard.
              A quiet place to play, finish, and move on.
            </p>
            <div className="reveal-item reveal-item-4">
              <Link href="/play" className="pill-primary">
                Play OneGames
              </Link>
              <p className="price-note">$1 / month · Every game included · Cancel anytime</p>
            </div>
          </div>

          <GameFamily />
          <div className="ecosystem-note reveal-item reveal-item-4">
            <span>One membership</span><i />
            <span>One new set daily</span><i />
            <span>No ads or endless feed</span>
          </div>
        </section>
      </HomeReveal>

      <SimpleFooter tagline="One good game at a time." />
    </main>
  );
}
