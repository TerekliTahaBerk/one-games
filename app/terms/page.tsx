import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms of the OneGames monthly membership.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Simple terms for a simple membership."
      lastUpdated="July 31, 2026"
    >
      <p>
        OneGames gives active members access to the daily game family. These
        terms describe what you can expect from us, and what we ask in return.
      </p>

      <h2>Membership</h2>
      <p>
        The plan is billed monthly at <strong>$1 USD</strong> and continues
        until you cancel. Your bank may apply its own conversion rate or fees.
        Cancelling stops the next renewal; access continues to the end of the
        period you have already paid for.
      </p>

      <h2>Daily games</h2>
      <p>
        Each game publishes one Easy, one Medium, and one Hard chapter every
        day. Availability, game types, and difficulty may evolve as the family
        grows. Games marked <strong>Coming soon</strong> are not part of what
        you can play today, and no date is promised for them.
      </p>

      <h2>Playing without an account</h2>
      <p>
        The option to try today&rsquo;s game without an account opens a
        short-lived session so you can play before deciding. It is not a
        membership, it carries no guarantee of availability, and it may change
        or be withdrawn.
      </p>

      <h2>Your progress</h2>
      <p>
        Puzzle progress and statistics are stored in your browser, not on our
        servers. Clearing your browser storage, switching device, or using a
        private window will start you from a clean slate. We cannot restore
        progress that was only ever local.
      </p>

      <h2>Fair use</h2>
      <p>
        Membership is for personal use. Please do not automate access,
        redistribute puzzles, resell access, or interfere with the service.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change materially, we will say so on this page before the
        change takes effect for existing members. The date at the top always
        reflects the most recent revision.
      </p>
    </LegalPage>
  );
}
