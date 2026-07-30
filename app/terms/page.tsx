import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="ecosystem-page">
      <Header />
      <article className="centered-page legal-page">
        <div className="centered-heading">
          <p className="one-eyebrow">Terms</p>
          <h1>Simple terms for a simple membership.</h1>
          <p>OneGames gives active members access to the daily game family.</p>
        </div>
        <section>
          <h2>Membership</h2>
          <p>The plan is billed monthly at $1 USD and continues until canceled. Your bank may apply its own conversion rate or fees.</p>
          <h2>Daily games</h2>
          <p>New chapters are published daily. Availability, game types, and difficulty may evolve as the family grows.</p>
          <h2>Fair use</h2>
          <p>Membership is for personal use. Please do not automate access, redistribute puzzles, or interfere with the service.</p>
        </section>
      </article>
      <Footer />
    </main>
  );
}
