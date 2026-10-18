import logo from "@/lib/logo.json";

// Pixel tower with a pump pill on the roof. Tower edges are lifted a shade so they read on black.
export default function Logo({ size = 28 }: { size?: number }) {
  const pal: Record<string, string> = { ...logo.pal, e: "#4b5060" };
  const rects: { x: number; y: number; w: number; c: string }[] = [];
  logo.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      let c = row[x];
      if (c === ".") {
        x++;
        continue;
      }
      let x2 = x;
      while (x2 < row.length && row[x2] === c) x2++;
      if (c === "k" && y >= 14) c = "e";
      rects.push({ x, y, w: x2 - x, c: pal[c] });
      x = x2;
    }
  });
  return (
    <svg
      className="logo-svg"
      viewBox={`0 0 ${logo.w} ${logo.h}`}
      width={(size * logo.w) / logo.h}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <g className="logo-pill">
        {rects.filter((r) => r.y < 14).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />)}
      </g>
      <g>
        {rects.filter((r) => r.y >= 14).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />)}
      </g>
    </svg>
  );
}
