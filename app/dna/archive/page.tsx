"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatLongDate, getTodayKey } from "@/lib/date";
import { loadDnaGame } from "@/lib/dna/persistence";
import {
  DNA_DIFFICULTIES,
  getDailyDnaPuzzle,
  getDnaArchiveDates,
} from "@/lib/dna/puzzles";

export default function DnaArchivePage() {
  const today = getTodayKey();
  const dates = getDnaArchiveDates(today);
  const [states, setStates] = useState<Record<string, string>>({});

  useEffect(() => {
    queueMicrotask(() =>
      setStates(
        Object.fromEntries(
          dates.map((date) => {
            const games = DNA_DIFFICULTIES.map((difficulty) => {
              const puzzle = getDailyDnaPuzzle(date, difficulty);
              return loadDnaGame(date, difficulty, puzzle.id, puzzle.size);
            });
            const completed = games.filter((game) => game?.completed).length;
            const started = games.some(
              (game) => game?.started && !game.completed,
            );
            return [
              date,
              completed
                ? `${completed}/3 completed`
                : started
                  ? "In progress"
                  : "Not played",
            ];
          }),
        ),
      ),
    );
    // Progress is intentionally read once after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page game-archive-page dna-archive-page">
      <SiteHeader back="/dna" backLabel="Game" />
      <main className="page-main is-reading">
        <div className="access-copy rise">
          <h1 className="display display-sm">OneDna archive.</h1>
          <p className="lede">
            Revisit the last 28 daily sequences. Each date keeps its own
            progress in this browser.
          </p>
        </div>
        <div className="archive-list">
          {dates.map((date) => (
            <Link
              href={`/dna?date=${date}`}
              className="archive-row"
              key={date}
              aria-label={`${date === today ? "Today" : formatLongDate(date)}, ${states[date] ?? "Not played"}`}
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
                className={`archive-status${states[date]?.includes("completed") ? " is-complete" : ""}`}
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
