import type { ColorGroupId } from "./types";

/**
 * The bridge between the semantic palette keys stored in puzzle data and the
 * way a group is named to a player or drawn on screen. Puzzle data never holds
 * a CSS value; the class here resolves `--region` and `--region-soft` in
 * app/globals.css, and each key also gets its own corner-marker shape so the
 * groups stay distinguishable without relying on hue alone.
 */

export interface RegionStyle {
  /** Human-friendly name used in labels and legends. */
  name: string;
  /** Shape of the corner marker — the non-colour cue. */
  marker: "dot" | "ring" | "triangle" | "square" | "diamond";
}

export const REGION_STYLES: Record<ColorGroupId, RegionStyle> = {
  coral: { name: "coral", marker: "dot" },
  violet: { name: "violet", marker: "ring" },
  mint: { name: "mint", marker: "triangle" },
  gold: { name: "gold", marker: "square" },
  sky: { name: "sky", marker: "diamond" },
};

export function regionName(color: ColorGroupId): string {
  return REGION_STYLES[color].name;
}

export function regionClass(color: ColorGroupId): string {
  return `region-${color}`;
}
