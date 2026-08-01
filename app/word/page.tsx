import type { Metadata } from "next";
import { WordGame } from "@/components/word/WordGame";
import { getTodayKey } from "@/lib/date";
import { getWordPuzzle } from "@/lib/word/puzzles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Play OneWord",
  description: "Find today’s calm five-letter word in six thoughtful guesses.",
  alternates: { canonical: "/word" },
};
export default async function WordPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  let date =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : getTodayKey();
  try {
    getWordPuzzle(date);
  } catch {
    date = getTodayKey();
  }
  return <WordGame date={date} />;
}
