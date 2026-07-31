import type { Metadata } from "next";
import Link from "next/link";
import { GameLogoFamily } from "@/components/GameLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Pricing",
  description: "One $1 monthly membership for every game in the OneGames family.",
};

export default function PricingPage() {
  return (
    <div className="page">
      <SiteHeader back="/" />

      <main className="page-main is-narrow">
        <div className="access-copy rise">
          <GameLogoFamily size={54} className="access-mark" />
          <p className="eyebrow">Simple pricing</p>
          <h1 className="display display-sm">One membership. Every game.</h1>
          <p className="lede">Daily play without ads, bundles, or complicated plans.</p>

          <div className="price-lockup">
            <sup>$</sup>
            <strong>1</strong>
            <span>/ month</span>
          </div>
          <p className="price-caption">OneSudoku today, every new OneGames title tomorrow.</p>

          <ul className="benefit-list">
            <li>
              <i aria-hidden="true">✓</i> Easy, Medium, and Hard every day
            </li>
            <li>
              <i aria-hidden="true">✓</i> One subscription across the family
            </li>
            <li>
              <i aria-hidden="true">✓</i> Cancel anytime
            </li>
          </ul>

          <div className="cta-row">
            <Link className="pill-primary" href="/play">
              Start OneGames — $1
            </Link>
            <p className="note">Secure monthly billing by Polar.</p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
