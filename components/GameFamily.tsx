import Link from "next/link";
import { GameLogo } from "./GameLogo";

const games = [
  {
    name: "OneSudoku",
    description: "A clear grid for a clear mind",
    prop: "sudoku",
    active: true,
  },
  {
    name: "OneWord",
    description: "One word, carefully found",
    prop: "word",
    active: false,
  },
  {
    name: "OneMatch",
    description: "Quiet connections",
    prop: "match",
    active: false,
  },
  {
    name: "OneNumbers",
    description: "A little arithmetic",
    prop: "numbers",
    active: false,
  },
] as const;

export function GameFamily() {
  return (
    <section className="game-family reveal-item reveal-item-4" aria-labelledby="family-heading">
      <div className="family-heading">
        <h2 id="family-heading">Meet the OneGames family.</h2>
        <p>Small daily games, all under one roof.</p>
      </div>
      <div className="family-grid">
        {games.map((game) => {
          const content = (
            <>
              <GameLogo game={game.prop} decorative />
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <small>{game.active ? "Play today" : "Coming soon"}</small>
            </>
          );
          return game.active ? (
            <Link href="/play" className="family-card active" key={game.name} aria-label={`Play ${game.name}`}>
              {content}
            </Link>
          ) : (
            <article className="family-card" key={game.name}>{content}</article>
          );
        })}
      </div>
    </section>
  );
}
