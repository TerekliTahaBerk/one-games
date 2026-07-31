import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What OneGames stores, and what it deliberately does not.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Quiet play includes quiet data."
      lastUpdated="July 31, 2026"
    >
      <p>
        OneGames collects only what is needed to verify access and operate your
        membership. This page describes what that means in practice.
      </p>

      <h2>What we keep</h2>
      <p>
        Your email address, your verification status, your subscription state,
        and a session token. The token is stored only as a SHA-256 hash, so the
        value in your browser cannot be reconstructed from our records.
      </p>
      <p>
        Puzzle progress, statistics, and preferences are <strong>not</strong>{" "}
        sent to us. They live in your browser&rsquo;s local storage under the{" "}
        <strong>onegames:v1</strong> namespace and stay on the device that
        created them.
      </p>

      <h2>Verification codes</h2>
      <p>Six-digit sign-in codes are deliberately short-lived:</p>
      <ul>
        <li>stored only as a keyed hash, never in plain text</li>
        <li>valid for ten minutes</li>
        <li>
          invalidated after five incorrect attempts, or after one successful use
        </li>
        <li>limited to one request per address per minute</li>
      </ul>

      <h2>Playing without an account</h2>
      <p>
        Choosing to play without an account sets a single short-lived cookie and
        nothing else. No email address is collected, and no record of the
        session is kept after it expires.
      </p>

      <h2>What we do not do</h2>
      <p>
        We do not sell personal data, build advertising profiles, or embed
        third-party advertising trackers. There is no analytics script following
        you between pages.
      </p>

      <h2>Service partners</h2>
      <p>
        Resend delivers verification emails and Polar processes subscription
        payments. Each receives only the information required for that service —
        your email address, and in Polar&rsquo;s case the subscription itself.
        We never see or store your card details.
      </p>

      <h2>Removal</h2>
      <p>
        Ask us to delete your account data at any time and we will remove your
        email address, verification records, and session tokens. Clearing your
        browser storage removes local puzzle progress independently of that.
      </p>
    </LegalPage>
  );
}
