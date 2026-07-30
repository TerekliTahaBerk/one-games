import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";

export const metadata: Metadata = {
  title: "Play OneSudoku",
  description: "Verify your email or test today’s OneSudoku.",
};

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  return <AccessGate checkoutReturn={params.checkout === "success"} />;
}
