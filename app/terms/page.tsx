import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms of the OneGames monthly membership.",
};

export default function TermsPage() {
  return (
    <div className="page">
      <SiteHeader back="/" />

      <main className="page-main is-reading">
        <div className="access-copy rise">
          <p className="eyebrow">Last updated February 2026</p>
          <h1 className="display display-sm">Simple terms for a simple membership.</h1>
          <p className="lede">
            OneGames gives active members access to the daily game family.
          </p>
        </div>

        <div className="reading-body">
          <h2>Membership</h2>
          <p>
            The plan is billed monthly at $1 USD and continues until you cancel. Your bank may
            apply its own conversion rate or fees. Cancelling stops the next renewal; access
            continues to the end of the paid period.
          </p>

          <h2>Daily games</h2>
          <p>
            New chapters are published daily. Availability, game types, and difficulty may evolve
            as the family grows. Games marked “Coming soon” are not yet part of what you can play
            today.
          </p>

          <h2>Playing without an account</h2>
          <p>
            The “try today’s game without an account” option opens a short-lived session so you can
            play before deciding. It is not a membership and carries no guarantee of availability.
          </p>

          <h2>Fair use</h2>
          <p>
            Membership is for personal use. Please do not automate access, redistribute puzzles, or
            interfere with the service.
          </p>

          <h2>Changes</h2>
          <p>
            If these terms change materially, we will say so on this page before the change takes
            effect for existing members.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
