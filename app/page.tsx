import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { GameFamily } from "@/components/GameFamily";
import { HomeReveal } from "@/components/HomeReveal";
import { SiteFooter } from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <div className="page">
      <HomeReveal>
        <header className="site-header reveal-item">
          <a
            href="https://www.oneread.email/"
            rel="noreferrer"
            className="parent-brand"
            aria-label="The One family — visit OneRead"
          >
            <span className="parent-brand-name link-underline">The One family</span>
            <span className="parent-brand-note">Sibling to OneRead</span>
          </a>

          <BrandLogo />
          <div className="header-trailing">
            <Link href="/about" className="header-text-link" aria-label="About OneGames">
              {/* The hairline belongs to the word, not to the 44px touch target —
                  the same arrangement the family credit uses on the left. */}
              <span className="link-underline">About</span>
            </Link>
          </div>
        </header>

        <main className="page-main">
          <h1 className="display reveal-item reveal-item-2">One thoughtful game at a time.</h1>

          <p className="lede reveal-item reveal-item-3">
            Three fresh chapters every day — Easy, Medium, and Hard. A quiet place to play, finish,
            and move on.
          </p>

          <div className="cta-row reveal-item reveal-item-4">
            <Link href="/play" className="pill-primary">
              Play OneGames
            </Link>
            <p className="note">$1 / month · Every game included · Cancel anytime</p>
          </div>

          <GameFamily />
        </main>
      </HomeReveal>

      <SiteFooter manifesto="No feed to check. Just something worth opening. For people who want better inputs without another app to open." />
    </div>
  );
}
