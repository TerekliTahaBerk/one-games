"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MiniGrid } from "@/components/MiniGrid";
import { formatLongDate, getTodayKey } from "@/lib/date";
import { getPuzzleStatus } from "@/lib/sudoku/persistence";

export default function HomePage() {
  const [status, setStatus] = useState("Ready when you are");
  const today = getTodayKey();

  useEffect(() => {
    queueMicrotask(() => setStatus(getPuzzleStatus(today)));
  }, [today]);

  return (
    <>
      <Header />
      <main>
        <section className="hero shell">
          <p className="eyebrow">A small daily pause</p>
          <h1>One good game<br />at a time.</h1>
          <p className="hero-copy">
            A quiet home for thoughtful daily games. Begin with a grid and a few
            unhurried minutes.
          </p>
          <Link className="button button-dark" href="/sudoku">
            Play today’s Sudoku <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="shell today-section" aria-labelledby="today-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Today · {formatLongDate(today)}</p>
              <h2 id="today-title">OneSudoku</h2>
            </div>
            <span className="status-chip">{status}</span>
          </div>
          <Link className="today-card" href="/sudoku">
            <div className="today-card-copy">
              <p className="card-kicker">The daily number puzzle</p>
              <h3>Clear the grid.<br />Clear your head.</h3>
              <p>
                Three considered difficulties, one calm ritual. Your progress
                stays on this device.
              </p>
              <span className="text-link">Play today’s grid <b aria-hidden="true">→</b></span>
            </div>
            <MiniGrid />
          </Link>
        </section>

        <section className="shell family-section" aria-labelledby="family-title">
          <div className="section-heading editorial-heading">
            <div>
              <p className="eyebrow">The collection</p>
              <h2 id="family-title">The OneGames family.</h2>
            </div>
            <p>Small games with a clear purpose. Nothing more than you need.</p>
          </div>
          <div className="game-list">
            <Link href="/sudoku" className="game-row available">
              <span className="game-index">01</span>
              <span>
                <strong>OneSudoku</strong>
                <small>A precise daily grid.</small>
              </span>
              <em>Play now</em>
              <b aria-hidden="true">→</b>
            </Link>
            {[
              ["02", "OneWord", "A word, carefully found."],
              ["03", "OneMatch", "Connections without clutter."],
              ["04", "OneNumbers", "A little arithmetic."],
            ].map(([index, name, description]) => (
              <div className="game-row muted" key={name}>
                <span className="game-index">{index}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
                <em>Coming soon</em>
              </div>
            ))}
          </div>
        </section>

        <section className="principle">
          <div className="shell principle-inner">
            <p className="eyebrow">Our principle</p>
            <blockquote>
              “A good game asks for your attention, then gives it back.”
            </blockquote>
            <p>
              No endless feeds. No noisy rewards. Just one thoughtfully made
              puzzle for the day, and the quiet satisfaction of finishing it.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
