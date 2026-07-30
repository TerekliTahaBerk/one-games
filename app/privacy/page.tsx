import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="ecosystem-page">
      <Header />
      <article className="centered-page legal-page">
        <div className="centered-heading">
          <p className="one-eyebrow">Privacy</p>
          <h1>Quiet play includes quiet data.</h1>
          <p>We collect only what is needed to verify access and operate your membership.</p>
        </div>
        <section>
          <h2>What we keep</h2>
          <p>Your email, verification status, subscription state, and a secure session token. Puzzle progress and preferences remain in your browser.</p>
          <h2>What we do not do</h2>
          <p>We do not sell personal data, build advertising profiles, or add third-party advertising trackers.</p>
          <h2>Service partners</h2>
          <p>Resend delivers verification emails and Polar processes subscription payments. Each handles only the information required for that service.</p>
        </section>
      </article>
      <Footer />
    </main>
  );
}
