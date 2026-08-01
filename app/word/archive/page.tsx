"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatLongDate, getTodayKey } from "@/lib/date";
import { loadWordGame } from "@/lib/word/persistence";
import { getWordArchiveDates, getWordPuzzle } from "@/lib/word/puzzles";

export default function WordArchivePage() {
  const today = getTodayKey(),
    dates = getWordArchiveDates(today);
  const [states, setStates] = useState<Record<string, string>>({});
  useEffect(() => {
    queueMicrotask(() =>
      setStates(
        Object.fromEntries(
          dates.map((date) => {
            const puzzle = getWordPuzzle(date),
              game = loadWordGame(date, puzzle.id);
            return [
              date,
              game?.status === "won"
                ? `Solved in ${game.guesses.length}/6`
                : game?.status === "lost"
                  ? "Completed"
                  : game?.guesses.length
                    ? "In progress"
                    : "Not played",
            ];
          }),
        ),
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page game-archive-page word-archive-page">
      <SiteHeader back="/word" backLabel="Game" />
      <main className="page-main is-reading">
        <div className="access-copy rise">
          <h1 className="display display-sm">OneWord archive.</h1>
          <p className="lede">
            Every published word, newest first. Archive play is saved locally
            without changing today&rsquo;s streak.
          </p>
        </div>
        <div className="archive-list">
          {dates.map((date) => (
            <Link
              href={`/word?date=${date}`}
              className="archive-row"
              key={date}
            >
              <span className="archive-date">
                <strong>
                  {date === today
                    ? "Today"
                    : formatLongDate(date).split(",")[0]}
                </strong>
                <small>{formatLongDate(date).replace(/^[^,]+,\s*/, "")}</small>
              </span>
              <span
                className={`archive-status${states[date]?.startsWith("Solved") ? " is-complete" : ""}`}
              >
                <i aria-hidden="true" />
                {states[date] ?? "Not played"}
              </span>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
