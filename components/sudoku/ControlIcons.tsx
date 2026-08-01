/**
 * Line icons for the utility row, drawn in the same 1.4px stroke style as the
 * header and footer marks so the game controls read as part of the site.
 */

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function UndoIcon() {
  return (
    <svg {...base}>
      <path d="M4 8h7.5a3.5 3.5 0 0 1 0 7H8" />
      <path d="M7 5 4 8l3 3" />
    </svg>
  );
}

export function RedoIcon() {
  return (
    <svg {...base}>
      <path d="M16 8H8.5a3.5 3.5 0 0 0 0 7H12" />
      <path d="m13 5 3 3-3 3" />
    </svg>
  );
}

export function EraseIcon() {
  return (
    <svg {...base}>
      <path d="M8.4 4.6 4 9a1.6 1.6 0 0 0 0 2.3l2.8 2.8h4.4l4.4-4.4a1.6 1.6 0 0 0 0-2.3l-3.5-3.5a1.6 1.6 0 0 0-2.3 0Z" />
      <path d="M6.4 7 12 12.6" />
    </svg>
  );
}

export function NotesIcon() {
  return (
    <svg {...base}>
      <path d="M13.6 3.6a1.7 1.7 0 0 1 2.4 2.4L8.2 13.8 5 15l1.2-3.2Z" />
      <path d="M4 17h12" />
    </svg>
  );
}

export function HintIcon() {
  return (
    <svg {...base}>
      <path d="M10 2.8a4.6 4.6 0 0 0-2.7 8.3c.5.4.8 1 .8 1.6v.4h3.8v-.4c0-.7.3-1.2.8-1.6A4.6 4.6 0 0 0 10 2.8Z" />
      <path d="M8.3 16h3.4M9 17.8h2" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base}>
      <path d="M7.6 5v10M12.4 5v10" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg {...base}>
      <path d="M7 4.8 15 10l-8 5.2Z" />
    </svg>
  );
}
