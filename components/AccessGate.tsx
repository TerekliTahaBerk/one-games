"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GameLogoFamily } from "./GameLogo";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Step = "email" | "code" | "payment" | "checking";

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return { ok: response.ok, data };
}

/**
 * Messages stay honest about the difference between "this went wrong" and
 * "this integration has no credentials yet" — the second case always points at
 * the test path rather than pretending the real one worked.
 */
function messageFor(error: unknown): string {
  switch (error) {
    case "email_not_configured":
      return "Email delivery is not connected on this deployment yet. You can still play today\u2019s game below.";
    case "storage_not_configured":
      return "This deployment has no database connected yet, so email sign-in is unavailable. You can still play today\u2019s game below.";
    case "delivery_failed":
      return "We couldn’t deliver the code. Check the address and try again.";
    case "cooldown":
      return "A code was just sent. Give it a minute before asking for another.";
    case "incorrect":
      return "That code isn’t right. Please check the email and try again.";
    case "expired":
      return "That code has expired. Request a fresh one.";
    case "too_many":
      return "Too many attempts on that code. Request a fresh one.";
    case "billing_not_configured":
      return "Checkout is not connected on this deployment yet.";
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
      const state = (await response.json()) as { allowed?: boolean; authenticated?: boolean };
      if (!active) return;
      if (state.allowed) {
        window.location.href = "/sudoku";
        return;
      }
      setStep(state.authenticated ? "payment" : "email");
    };
    void check();
    return () => {
      active = false;
    };
  }, [checkoutReturn]);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
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
    if (result.data.allowed) {
      window.location.href = "/sudoku";
      return;
    }
    setStep("payment");
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
    <div className="page">
      <SiteHeader back="/" />

      <main className="page-main is-narrow">
        <div className="access-copy rise">
          {step === "email" && (
            <>
              <h1 className="display display-sm">Where should we send your code?</h1>
              <p className="lede">
                Enter your email and we’ll send a six-digit code. No password, no noise.
              </p>
              {/* noValidate keeps validation messaging in our own voice and styling. */}
              <form onSubmit={submitEmail} className="access-form" noValidate>
                <label className="sr-only" htmlFor="access-email">
                  Email address
                </label>
                <input
                  id="access-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <button className="pill-primary" disabled={busy}>
                  {busy ? "Please wait…" : "Continue with email"}
                </button>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <h1 className="display display-sm">Check your inbox.</h1>
              <p className="lede">
                We sent a six-digit code to <strong>{email}</strong>. It expires in ten minutes.
              </p>
              <form onSubmit={submitCode} className="access-form" noValidate>
                <label className="sr-only" htmlFor="access-code">
                  Verification code
                </label>
                <input
                  id="access-code"
                  className="code-input"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  autoComplete="one-time-code"
                />
                <button className="pill-primary" disabled={busy}>
                  {busy ? "Please wait…" : "Verify email"}
                </button>
              </form>
              <button className="text-action" type="button" onClick={() => setStep("email")}>
                Use another email
              </button>
            </>
          )}

          {step === "payment" && (
            <>
              <GameLogoFamily size={54} className="access-mark" />
              <h1 className="display display-sm">Every daily game. One subscription.</h1>
              <p className="lede">
                Today’s Easy, Medium, and Hard chapters — and every new game that joins the family.
              </p>
              <div className="price-lockup">
                <sup>$</sup>
                <strong>1</strong>
                <span>/ month</span>
              </div>
              <ul className="benefit-list">
                <li>
                  <i aria-hidden="true">✓</i> Three new chapters every day
                </li>
                <li>
                  <i aria-hidden="true">✓</i> The complete OneGames family
                </li>
                <li>
                  <i aria-hidden="true">✓</i> Cancel whenever you like
                </li>
              </ul>
              <div className="cta-row">
                <button className="pill-primary" type="button" onClick={checkout} disabled={busy}>
                  {busy ? "Please wait…" : "Subscribe for $1 / month"}
                </button>
                <p className="note">Billing is handled securely by Polar.</p>
              </div>
            </>
          )}

          {step === "checking" && (
            <>
              <h1 className="display display-sm">Checking your access.</h1>
              <p className="lede">
                Polar is confirming your subscription. This usually takes only a moment.
              </p>
              <span className="soft-loader" aria-label="Checking">
                <i />
                <i />
                <i />
              </span>
            </>
          )}

          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}

          {step === "email" && (
            <form action="/api/access/test" method="post">
              <button className="quiet-link" type="submit" disabled={busy}>
                {/* The underline hugs the text rather than the 44px touch box. */}
                <span className="link-underline">
                  Or try today&rsquo;s game without an account
                </span>
              </button>
            </form>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
