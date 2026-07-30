import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function AboutPage() {
  return (
    <main className="ecosystem-page">
      <Header />
      <section className="centered-page about-page">
        <div className="centered-heading">
          <p className="one-eyebrow">About OneGames</p>
          <h1>A little space to think.</h1>
          <p>
            OneGames is a family of small daily games—made with care,
            respectful of your attention, and complete when you are.
          </p>
        </div>
        <div className="manifesto-copy">
          <h2>One clear job.</h2>
          <p>
            OneRead delivers one worthwhile read. OneGames brings the same
            restraint to play: no feeds, no streak pressure, no attention traps.
          </p>
          <p>
            Each game publishes one Easy, one Medium, and one Hard chapter each
            day. Finish one, finish all three, or simply come back tomorrow.
          </p>
        </div>
        <div className="values">
          {[
            ["01", "Calm by design", "No streak anxiety, noisy rewards, or endless loops."],
            ["02", "One membership", "A single $1 plan opens every game in the family."],
            ["03", "Finished is good", "Complete today’s chapter, enjoy the moment, and carry on."],
          ].map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
        <Link className="pill-primary" href="/play">Play OneGames</Link>
      </section>
      <Footer />
    </main>
  );
}
