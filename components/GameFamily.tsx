import Link from "next/link";
import type { CSSProperties } from "react";

const games = [
  {
    name: "OneSudoku",
    description: "A clear grid for a clear mind",
    tone: "blue",
    prop: "sudoku",
    active: true,
  },
  {
    name: "OneWord",
    description: "One word, carefully found",
    tone: "lilac",
    prop: "word",
    active: false,
  },
  {
    name: "OneMatch",
    description: "Quiet connections",
    tone: "rose",
    prop: "match",
    active: false,
  },
  {
    name: "OneNumbers",
    description: "A little arithmetic",
    tone: "green",
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
        {games.map((game, index) => {
          const content = (
            <>
              <div
                className={`game-mascot mascot-${game.prop} ${game.tone}`}
                style={{ "--mascot-delay": `${index * -1.3}s` } as CSSProperties}
                aria-hidden="true"
              >
                <div className="mascot-body">
                  <span className="mascot-face"><i /><i /></span>
                </div>
                <div className={`mascot-prop prop-${game.prop}`}>
                  {game.prop === "sudoku" && Array.from({ length: 9 }, (_, cell) => <i key={cell}>{cell === 4 ? "1" : ""}</i>)}
                  {game.prop === "word" && <><i>W</i><i>O</i><i>R</i><i>D</i></>}
                  {game.prop === "match" && <><i /><i /><i /><i /></>}
                  {game.prop === "numbers" && <><i>2</i><b>+</b><i>3</i></>}
                </div>
              </div>
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
