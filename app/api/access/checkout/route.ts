import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/access/db";
import { getAccessState } from "@/lib/access/session";
import { recordCheckoutStarted } from "@/lib/access/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getAccessState();
  if (!access.authenticated || !access.email || access.testMode) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }
  if (access.allowed) {
    return NextResponse.json({ ok: true, action: "already_active", url: "/sudoku" });
  }
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  const productId = process.env.POLAR_ONEGAMES_PRODUCT_ID?.trim();
  if (!accessToken || !productId) {
    return NextResponse.json({ ok: false, error: "billing_not_configured" }, { status: 503 });
  }

  // Checked before opening the checkout, so we never take someone to a payment
  // page we cannot record the result of.
  if (!(await hasDatabase())) {
    return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }

  const origin = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const polar = new Polar({
    accessToken,
    server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
  const checkout = await polar.checkouts.create({
    products: [productId],
    customerEmail: access.email,
    successUrl: `${origin}/play?checkout=success`,
    returnUrl: `${origin}/play`,
    metadata: { email: access.email, product: "onegames" },
    customerMetadata: { email: access.email, product: "onegames" },
  });
  await recordCheckoutStarted(access.email, checkout.id);
  return NextResponse.json({ ok: true, action: "redirect", url: checkout.url });
}
