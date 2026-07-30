"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { formatLongDate, getTodayKey } from "@/lib/date";
import { loadGame } from "@/lib/sudoku/persistence";
import { DIFFICULTIES, getArchiveDates } from "@/lib/sudoku/puzzles";
import type { Difficulty } from "@/lib/sudoku/types";

type DateState = { difficulty: Difficulty; completed: boolean; started: boolean }[];

export default function ArchivePage() {
  const today = getTodayKey();
  const dates = getArchiveDates(today);
  const [states, setStates] = useState<Record<string, DateState>>({});

  useEffect(() => {
    queueMicrotask(() => setStates(Object.fromEntries(dates.map((date) => [
        date,
        DIFFICULTIES.map((difficulty) => {
          const game = loadGame(date, difficulty);
          return { difficulty, completed: Boolean(game?.completed), started: Boolean(game?.started) };
        }),
      ]))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <main className="shell archive-page">
        <p className="eyebrow">On this device</p>
        <h1>Your local archive.</h1>
        <p className="page-intro">
          Revisit a recent grid or see what you have completed. Progress lives
          only in this browser.
        </p>
        <div className="archive-list">
          {dates.map((date) => {
            const state = states[date] ?? [];
            const completed = state.filter((item) => item.completed).map((item) => item.difficulty);
            const inProgress = state.some((item) => item.started && !item.completed);
            const label = completed.length
              ? `Completed · ${completed.join(", ")}`
              : inProgress ? "In progress" : "Not played";
            return (
              <Link href={`/sudoku?date=${date}`} className="archive-row" key={date}>
                <span className="archive-date">
                  <strong>{date === today ? "Today" : formatLongDate(date).split(",")[0]}</strong>
                  <small>{formatLongDate(date).replace(/^[^,]+,\s*/, "")}</small>
                </span>
                <span className={`archive-status ${completed.length ? "complete" : ""}`}>
                  <i aria-hidden="true" />{label}
                </span>
                <b aria-hidden="true">→</b>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
