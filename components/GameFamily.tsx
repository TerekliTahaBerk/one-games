import Link from "next/link";
import { GameLogo, type GameKey } from "./GameLogo";

const GAMES: {
  key: GameKey;
  name: string;
  description: string;
  href?: string;
}[] = [
  {
    key: "sudoku",
    name: "OneSudoku",
    description: "A clear grid for a clear mind",
    href: "/play",
  },
  { key: "word", name: "OneWord", description: "One word, carefully found" },
  { key: "match", name: "OneMatch", description: "Quiet connections" },
  { key: "numbers", name: "OneNumbers", description: "A little arithmetic" },
];

/** The four marks at homepage scale — the family, shown rather than described. */
export function GameFamily() {
  return (
    <section className="game-family reveal-item reveal-item-4" aria-labelledby="game-family-heading">
      <div className="game-family-heading">
        <h2 id="game-family-heading" className="section-title">
          Meet the OneGames family.
        </h2>
        <p>Small daily games, all under one membership.</p>
      </div>
      <div className="game-family-grid">
        {GAMES.map((game) => {
          const content = (
            <>
              <GameLogo game={game.key} size={104} decorative />
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <small>{game.href ? "Play today" : "Coming soon"}</small>
            </>
          );

          return game.href ? (
            <Link
              key={game.key}
              href={game.href}
              className="game-card is-active"
              aria-label={`Play ${game.name}`}
            >
              {content}
            </Link>
          ) : (
            <article key={game.key} className="game-card">
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
