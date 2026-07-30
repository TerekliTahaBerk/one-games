import Link from "next/link";

const games = [
  {
    name: "OneSudoku",
    description: "A clear grid for a clear mind.",
    tone: "blue",
    active: true,
  },
  {
    name: "OneWord",
    description: "One word, carefully found.",
    tone: "lilac",
    active: false,
  },
  {
    name: "OneMatch",
    description: "Quiet connections.",
    tone: "rose",
    active: false,
  },
  {
    name: "OneNumbers",
    description: "A little arithmetic.",
    tone: "green",
    active: false,
  },
] as const;

export function GameFamily() {
  return (
    <section className="game-family reveal-unit reveal-4" aria-labelledby="family-heading">
      <div className="family-heading">
        <h2 id="family-heading">Meet the OneGames family.</h2>
        <p>One subscription. Every game as it joins.</p>
      </div>
      <div className="family-grid">
        {games.map((game, index) => {
          const content = (
            <>
              <div className={`game-mascot ${game.tone}`} aria-hidden="true">
                <div className="mascot-grid">
                  {Array.from({ length: 9 }, (_, cell) => <i key={cell}>{cell === 4 ? index + 1 : ""}</i>)}
                </div>
                <span className="mascot-eye left" />
                <span className="mascot-eye right" />
              </div>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <small>{game.active ? "Available today" : "Coming soon"}</small>
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
