import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="about-page">
        <section className="shell about-hero">
          <p className="eyebrow">About OneGames</p>
          <h1>A little space<br />to think.</h1>
          <p>
            OneGames is a home for small daily puzzles—made with care, respectful
            of your attention, and finished when you are.
          </p>
        </section>
        <section className="about-story">
          <div className="shell two-column">
            <h2>One clear job.</h2>
            <div>
              <p>
                It began with a simple belief: digital products can be useful
                without asking for more of your day. Our sibling, OneRead, puts
                one worthwhile read in your inbox. OneGames brings the same
                restraint to play.
              </p>
              <p>
                The first game is OneSudoku—a precise, familiar grid designed
                for a few focused minutes. More games may follow, but each must
                earn its place.
              </p>
              <Link className="text-link" href="/sudoku">Play today’s OneSudoku <b aria-hidden="true">→</b></Link>
            </div>
          </div>
        </section>
        <section className="shell values">
          {[
            ["01", "Calm by design", "No streak anxiety, noisy rewards, or endless loops."],
            ["02", "Local by default", "Your progress stays on your device. No account required."],
            ["03", "Finished is good", "Complete the puzzle, enjoy the moment, and carry on."],
          ].map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
