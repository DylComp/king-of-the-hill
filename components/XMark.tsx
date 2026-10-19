/**
 * X's mark redrawn on a 16px pixel grid to match the GitHub mark beside it: a hollow thick
 * stroke from top left to bottom right, crossed by a thin stroke that stops at its edges.
 */
const CELLS: [number, number][] = [];
for (let y = 1; y <= 14; y++) {
  const a = y - 1; // thick stroke spans columns a..a+3
  const solid = y === 1 || y === 14;
  for (let x = a; x <= a + 3; x++) if (solid || x === a || x === a + 3) CELLS.push([x, y]);
  const t = 15 - y; // thin stroke
  if (t < a || t > a + 3) CELLS.push([t, y]);
}

export default function XMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}
