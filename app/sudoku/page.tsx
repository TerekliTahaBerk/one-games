"use client";

import { useSearchParams } from "next/navigation";
import { SudokuGame } from "@/components/sudoku/SudokuGame";
import { getTodayKey } from "@/lib/date";

export default function SudokuPage() {
  const params = useSearchParams();
  const requestedDate = params.get("date");
  const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getTodayKey();
  return <SudokuGame date={date} />;
}
