import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What OneGames stores, and what it deliberately does not.",
};

export default function PrivacyPage() {
  return (
    <div className="page">
      <SiteHeader back="/" />

      <main className="page-main is-reading">
        <div className="access-copy rise">
          <p className="eyebrow">Last updated February 2026</p>
          <h1 className="display display-sm">Quiet play includes quiet data.</h1>
          <p className="lede">
            We collect only what is needed to verify access and operate your membership.
          </p>
        </div>

        <div className="reading-body">
          <h2>What we keep</h2>
          <p>
            Your email address, verification status, subscription state, and a hashed session
            token. Puzzle progress, statistics, and preferences stay in your browser’s local
            storage and are never sent to us.
          </p>

          <h2>Verification codes</h2>
          <p>
            Six-digit codes are stored only as a keyed hash, expire after ten minutes, and are
            invalidated after five incorrect attempts or a single successful use.
          </p>

          <h2>What we do not do</h2>
          <p>
            We do not sell personal data, build advertising profiles, or embed third-party
            advertising trackers.
          </p>

          <h2>Service partners</h2>
          <p>
            Resend delivers verification emails and Polar processes subscription payments. Each
            receives only the information required for that service.
          </p>

          <h2>Removal</h2>
          <p>
            Ask us to delete your account data at any time and we will remove your email,
            verification records, and session tokens. Clearing your browser storage removes local
            puzzle progress.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
