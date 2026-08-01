"use client";

import { useEffect } from "react";
import { regionClass, REGION_STYLES } from "@/lib/sudoku/regions";
import type { ColoredGroup } from "@/lib/sudoku/types";

interface Props {
  groups: readonly ColoredGroup[];
  onDismiss: () => void;
}

/**
 * The first-time explainer for colored groups.
 *
 * Deliberately an inline callout rather than a blocking modal: it introduces
 * the rule without standing between the player and the grid. Escape or the
 * button dismisses it, and the dismissal is remembered on this device.
 */
export function ColoredRuleIntro({ groups, onDismiss }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  if (groups.length === 0) return null;

  return (
    <aside className="rule-intro" aria-labelledby="rule-intro-title">
      <div className="rule-intro-sample" aria-hidden="true">
        {groups.slice(0, 3).map((group, position) => (
          <span key={group.id} className={`rule-intro-cell ${regionClass(group.color)}`} data-marker={REGION_STYLES[group.color].marker}>
            {position + 4}
          </span>
        ))}
      </div>
      <div className="rule-intro-copy">
        <h2 id="rule-intro-title">Something new in the grid.</h2>
        <p>
          Some cells are tinted and share a colour. Matching colored cells cannot repeat a number —
          on top of the usual row, column and box rules.
        </p>
      </div>
      <button type="button" className="rule-intro-dismiss" onClick={onDismiss}>
        Got it
      </button>
    </aside>
  );
}
