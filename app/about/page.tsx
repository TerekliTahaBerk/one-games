import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About",
  description: "OneGames is the daily-games member of the OneRead family.",
};

const VALUES = [
  ["01", "Calm by design", "No streak anxiety, noisy rewards, or endless loops."],
  ["02", "One membership", "A single $1 plan opens every game in the family."],
  ["03", "Finished is good", "Complete today’s chapter, enjoy the moment, and carry on."],
] as const;

export default function AboutPage() {
  return (
    <div className="page">
      <SiteHeader back="/" />

      <main className="page-main is-reading">
        <div className="access-copy rise">
          <h1 className="display display-sm">A little space to think.</h1>
          <p className="lede">
            OneGames is a family of small daily games — made with care, respectful of your
            attention, and complete when you are.
          </p>
        </div>

        <div className="reading-body">
          <h2>One clear job.</h2>
          <p>
            OneRead delivers one worthwhile read. OneGames brings the same restraint to play: no
            feeds, no streak pressure, no attention traps. Same company, same design system, same
            promise about your time.
          </p>
          <p>
            Each game publishes one Easy, one Medium, and one Hard chapter every day. Finish one,
            finish all three, or simply come back tomorrow.
          </p>
        </div>

        <ul className="value-list">
          {VALUES.map(([number, title, text]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>

        <div className="cta-row">
          <Link className="pill-primary" href="/play">
            Play OneGames
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
