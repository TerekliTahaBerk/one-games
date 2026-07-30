const cells = [5, 0, 0, 0, 7, 0, 0, 0, 2, 0, 4, 0, 8, 0, 1, 0, 0, 0, 7, 0, 8, 0, 0, 0, 4, 0, 0, 0, 8, 0, 7, 0, 0, 0, 2, 0];

export function MiniGrid() {
  return (
    <div className="mini-grid" aria-hidden="true">
      {cells.map((value, index) => <span key={index}>{value || ""}</span>)}
    </div>
  );
}
