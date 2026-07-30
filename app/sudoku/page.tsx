import { redirect } from "next/navigation";
import { SudokuGame } from "@/components/sudoku/SudokuGame";
import { getTodayKey } from "@/lib/date";
import { getAccessState } from "@/lib/access/session";

export const dynamic = "force-dynamic";

export default async function SudokuPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const access = await getAccessState();
  if (!access.allowed) redirect("/play");
  const params = await searchParams;
  const requestedDate = params.date;
  const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : getTodayKey();
  return <SudokuGame date={date} />;
}
