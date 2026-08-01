import type { DnaBase } from "@/lib/dna/types";

export function DnaControls({
  locked,
  canUndo,
  canRedo,
  onEnter,
  onErase,
  onUndo,
  onRedo,
  onHint,
}: {
  locked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onEnter(base: DnaBase): void;
  onErase(): void;
  onUndo(): void;
  onRedo(): void;
  onHint(): void;
}) {
  return (
    <div className="dna-controls" aria-label="OneDNA controls">
      <div className="dna-keypad">
        {(["A", "T", "C", "G"] as DnaBase[]).map((base) => (
          <button
            key={base}
            type="button"
            className={`dna-key family-${base === "A" || base === "T" ? "at" : "cg"}`}
            onClick={() => onEnter(base)}
            disabled={locked}
            aria-label={`Enter ${base}`}
          >
            <i aria-hidden="true" />
            {base}
          </button>
        ))}
      </div>
      <div className="dna-utilities">
        <button type="button" onClick={onUndo} disabled={locked || !canUndo}>
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={locked || !canRedo}>
          Redo
        </button>
        <button type="button" onClick={onErase} disabled={locked}>
          Erase
        </button>
        <button type="button" onClick={onHint} disabled={locked}>
          Hint
        </button>
      </div>
    </div>
  );
}
