import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";

export const metadata: Metadata = {
  title: "Play OneGames",
  description: "Verify your email or test today’s OneSudoku or OneDNA.",
};

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; game?: string }>;
}) {
  const params = await searchParams;
  return (
    <AccessGate
      checkoutReturn={params.checkout === "success"}
      game={params.game === "dna" ? "dna" : "sudoku"}
    />
  );
}
