import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OneDna Archive",
  description: "Replay the last 28 daily OneDna puzzles.",
  alternates: { canonical: "/dna/archive" },
};
export default function DnaArchiveLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
