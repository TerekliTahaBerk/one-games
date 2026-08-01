import { GameLogo } from "./GameLogo";

const PRODUCTS = [
  {
    key: "sudoku" as const,
    name: "OneSudoku",
    description: "A pastel mosaic for a clear mind.",
  },
  {
    key: "dna" as const,
    name: "OneDna",
    description: "Four colors. Perfect pairs.",
  },
] as const;

export function ProductPair({ className = "" }: { className?: string }) {
  return (
    <section
      className={`product-pair ${className}`.trim()}
      aria-label="OneSudoku and OneDna"
    >
      {PRODUCTS.map((product) => (
        <article
          className={`product-chip product-chip-${product.key}`}
          key={product.key}
        >
          <GameLogo game={product.key} size={48} decorative />
          <span>
            <strong>{product.name}</strong>
            <small>{product.description}</small>
            <i>Easy · Medium · Hard</i>
          </span>
        </article>
      ))}
    </section>
  );
}
