"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { SimpleFooter } from "./SimpleFooter";

type Step = "email" | "code" | "payment" | "checking";

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { ok: response.ok, data };
}

function messageFor(error: unknown): string {
  switch (error) {
    case "email_not_configured":
      return "Email delivery is being connected. You can test the game below.";
    case "delivery_failed":
      return "We couldn’t deliver the code. Check the address and try again.";
    case "cooldown":
      return "A code was just sent. Give it a minute before trying again.";
    case "incorrect":
      return "That code isn’t right. Please check the email and try again.";
    case "expired":
      return "That code has expired. Request a fresh one.";
    case "billing_not_configured":
      return "Secure checkout is being connected. Test access is available below.";
    default:
      return "Something went wrong. Please try once more.";
  }
}

export function AccessGate({ checkoutReturn = false }: { checkoutReturn?: boolean }) {
  const [step, setStep] = useState<Step>(checkoutReturn ? "checking" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!checkoutReturn) return;
    let active = true;
    const check = async () => {
      const response = await fetch("/api/access/status");
      const state = await response.json() as { allowed?: boolean; authenticated?: boolean };
      if (!active) return;
      if (state.allowed) {
        window.location.href = "/sudoku";
      } else {
        setStep(state.authenticated ? "payment" : "email");
      }
    };
    void check();
    return () => { active = false; };
  }, [checkoutReturn]);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    const result = await postJson("/api/access/request-code", { email });
    setBusy(false);
    if (!result.ok) {
      setError(messageFor(result.data.error));
      return;
    }
    setStep("code");
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    setBusy(true);
    const result = await postJson("/api/access/confirm-code", { email, code });
    setBusy(false);
    if (!result.ok) {
      setError(messageFor(result.data.error));
      return;
    }
    if (result.data.allowed) window.location.href = "/sudoku";
    else setStep("payment");
  };

  const checkout = async () => {
    setBusy(true);
    setError("");
    const result = await postJson("/api/access/checkout");
    setBusy(false);
    if (result.ok && typeof result.data.url === "string") {
      window.location.href = result.data.url;
      return;
    }
    setError(messageFor(result.data.error));
  };

  return (
    <main className="access-page">
      <header className="access-topbar">
        <Link href="/" className="back-link" aria-label="Back to OneGames">← <span>Back</span></Link>
        <BrandLogo />
      </header>
      <section className="access-shell">
        <div className="access-copy">
          {step === "email" && (
            <>
              <p className="one-eyebrow">One membership · Every game</p>
              <h1>Start OneGames.</h1>
              <p>Enter your email and we’ll send a six-digit code. No password, no noise.</p>
              <form onSubmit={submitEmail} className="access-form">
                <label className="sr-only" htmlFor="access-email">Email address</label>
                <input
                  id="access-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <button className="pill-primary" disabled={busy}>{busy ? "Please wait…" : "Continue with email"}</button>
              </form>
            </>
          )}
          {step === "code" && (
            <>
              <p className="one-eyebrow">Email verification</p>
              <h1>Check your inbox.</h1>
              <p>We sent a six-digit code to <strong>{email}</strong>. It expires in ten minutes.</p>
              <form onSubmit={submitCode} className="access-form">
                <label className="sr-only" htmlFor="access-code">Verification code</label>
                <input
                  id="access-code"
                  className="code-input"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                />
                <button className="pill-primary" disabled={busy}>{busy ? "Please wait…" : "Verify email"}</button>
              </form>
              <button className="text-action" type="button" onClick={() => setStep("email")}>Use another email</button>
            </>
          )}
          {step === "payment" && (
            <>
              <p className="one-eyebrow">Your email is verified</p>
              <h1>Every daily game.<br />One subscription.</h1>
              <p>Today’s Easy, Medium, and Hard chapters—and every new game that joins the family.</p>
              <div className="membership-card">
                <div className="price-lockup"><strong><sup>$</sup>1</strong><span>per month</span></div>
                <ul>
                  <li><i>✓</i> Three new chapters every day</li>
                  <li><i>✓</i> The complete OneGames family</li>
                  <li><i>✓</i> Cancel whenever you like</li>
                </ul>
              </div>
              <button className="pill-primary" type="button" onClick={checkout} disabled={busy}>
                {busy ? "Please wait…" : "Subscribe for $1 / month"}
              </button>
              <p className="billing-note">Billing is handled securely by Polar.</p>
            </>
          )}
          {step === "checking" && (
            <>
              <p className="one-eyebrow">OneGames membership</p>
              <h1>Checking your access.</h1>
              <p>Polar is confirming your subscription. This usually takes only a moment.</p>
              <span className="soft-loader" aria-label="Checking"><i /><i /><i /></span>
            </>
          )}
          {error && <p className="access-error" role="alert">{error}</p>}
          {step === "email" && (
            <>
              <div className="test-divider"><span>or</span></div>
              <form action="/api/access/test" method="post">
                <button className="test-game" type="submit" disabled={busy}>
                  Test this game
                  <small>No email or payment required</small>
                </button>
              </form>
            </>
          )}
        </div>
      </section>
      <SimpleFooter tagline="One game. No noise." />
    </main>
  );
}
