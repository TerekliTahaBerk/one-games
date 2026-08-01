import type { DnaBase } from "@/lib/dna/types";
import {
  EraseIcon,
  HintIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/sudoku/ControlIcons";

const FAMILIES: { label: string; bases: DnaBase[]; className: string }[] = [
  { label: "A–T pair", bases: ["A", "T"], className: "family-at" },
  { label: "C–G pair", bases: ["C", "G"], className: "family-cg" },
];

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
        {FAMILIES.map((family) => (
          <div
            className={`dna-key-family ${family.className}`}
            key={family.label}
          >
            <span>{family.label}</span>
            <div>
              {family.bases.map((base) => (
                <button
                  key={base}
                  type="button"
                  className="dna-key"
                  onClick={() => onEnter(base)}
                  disabled={locked}
                  aria-label={`Enter ${base}`}
                >
                  <i aria-hidden="true" />
                  {base}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="dna-utilities">
        <button type="button" onClick={onUndo} disabled={locked || !canUndo}>
          <UndoIcon />
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={locked || !canRedo}>
          <RedoIcon />
          Redo
        </button>
        <button type="button" onClick={onErase} disabled={locked}>
          <EraseIcon />
          Erase
        </button>
        <button type="button" onClick={onHint} disabled={locked}>
          <HintIcon />
          Hint
        </button>
      </div>
    </div>
  );
}
