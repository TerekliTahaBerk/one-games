import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DnaGame } from "@/components/dna/DnaGame";
import { getAccessState } from "@/lib/access/session";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Play OneDna",
  description: "Solve today’s calm daily DNA pairing puzzle.",
  alternates: { canonical: "/dna" },
};
export default async function DnaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const access = await getAccessState();
  if (!access.allowed) redirect("/play?game=dna");
  const params = await searchParams;
  const date =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : getTodayKey();
  return <DnaGame date={date} />;
}
