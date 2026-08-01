"use client";

import { regionClass, regionName, REGION_STYLES } from "@/lib/sudoku/regions";
import type { ColoredGroup } from "@/lib/sudoku/types";

interface Props {
  groups: readonly ColoredGroup[];
  /** Opens the fuller explainer; also the small-screen affordance. */
  onExplain: () => void;
}

/**
 * A quiet strip under the board naming today's colored groups. It stays a
 * single line on wide screens and collapses to swatches plus an info button on
 * narrow ones, where the sentence would otherwise crowd the grid.
 */
export function ColoredRuleLegend({ groups, onExplain }: Props) {
  if (groups.length === 0) return null;

  return (
    <div className="rule-legend">
      <ul className="rule-swatches">
        {groups.map((group) => (
          <li key={group.id}>
            <span
              className={`rule-swatch ${regionClass(group.color)}`}
              data-marker={REGION_STYLES[group.color].marker}
              aria-hidden="true"
            />
            <span className="sr-only">{regionName(group.color)} group</span>
          </li>
        ))}
      </ul>
      <p>Matching colored cells cannot repeat a number.</p>
      <button type="button" className="rule-info" onClick={onExplain} aria-label="How colored cells work">
        <span aria-hidden="true">?</span>
      </button>
    </div>
  );
}
