import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { GameLogo } from "@/components/GameLogo";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Pricing",
  description: "One $1 monthly membership for every game in the OneGames family.",
};

export default function PricingPage() {
  return (
    <main className="ecosystem-page">
      <Header />
      <section className="centered-page pricing-page">
        <div className="centered-heading">
          <p className="one-eyebrow">Simple pricing</p>
          <h1>One membership.<br />Every game.</h1>
          <p>Daily play without ads, bundles, or complicated plans.</p>
        </div>
        <div className="pricing-lockup">
          <div className="membership-logo-row" aria-label="Games included">
            <GameLogo game="sudoku" />
            <GameLogo game="word" />
            <GameLogo game="match" />
            <GameLogo game="numbers" />
          </div>
          <div className="pricing-number"><sup>$</sup><strong>1</strong><span>/ month</span></div>
          <p>OneSudoku today, every new OneGames title tomorrow.</p>
          <ul>
            <li><i>✓</i> Easy, Medium, and Hard every day</li>
            <li><i>✓</i> One subscription across the family</li>
            <li><i>✓</i> Cancel anytime</li>
          </ul>
          <Link className="pill-primary" href="/play">Start OneGames — $1</Link>
          <small>Secure monthly billing by Polar.</small>
        </div>
      </section>
      <Footer />
    </main>
  );
}
