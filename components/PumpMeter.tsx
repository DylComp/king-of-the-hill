// The animated mark beside the logo: a pixel elevator rides up a neon shaft, lighting each
// floor as it passes, and a firework pops off the roof when it reaches the top. Drawn on a
// 15x22 grid at exactly 2px per pixel so it stays crisp. Pure CSS (transform and opacity
// only, stepped), so it costs next to nothing to run.
const FLOORS = [18, 15, 12, 9, 6];
const SPARKS: [number, number, string][] = [
  [-5, -3, "#fde68a"],
  [5, -3, "#86efac"],
  [-3, -5, "#ffffff"],
  [3, -5, "#fde68a"],
  [0, -6, "#86efac"],
  [-6, 1, "#ffffff"],
  [6, 1, "#fde68a"],
  [-2, -2, "#86efac"],
  [2, -2, "#ffffff"],
];
const WALL = "#2f6b45";

export default function PumpMeter() {
  return (
    <svg className="pump-meter" viewBox="0 0 15 22" width={30} height={44} shapeRendering="crispEdges" aria-hidden>
      {/* antenna with a blinking beacon */}
      <rect x={7} y={1} width={1} height={2} fill={WALL} />
      <rect className="pm-beacon" x={6} y={0} width={3} height={1} fill="#f87171" />
      {/* shaft */}
      <rect x={0} y={3} width={15} height={1} fill={WALL} />
      <rect x={0} y={3} width={1} height={18} fill={WALL} />
      <rect x={14} y={3} width={1} height={18} fill={WALL} />
      <rect x={0} y={21} width={15} height={1} fill="#4ade80" />
      {/* floors: a dark window pair, and a lit pair that switches on as the car passes */}
      {FLOORS.map((y, i) => (
        <g key={y}>
          <rect x={2} y={y} width={3} height={2} fill="#11281a" />
          <rect x={10} y={y} width={3} height={2} fill="#11281a" />
          <g className={`pm-win pm-f${i}`}>
            <rect x={2} y={y} width={3} height={2} />
            <rect x={10} y={y} width={3} height={2} />
          </g>
        </g>
      ))}
      {/* cable and car */}
      <rect x={7} y={4} width={1} height={14} fill="#1d3a28" />
      <g className="pm-car">
        <rect x={5} y={18} width={5} height={2} fill="#eafff0" />
        <rect x={6} y={18} width={3} height={1} fill="#4ade80" />
      </g>
      {/* roof firework */}
      {SPARKS.map(([dx, dy, c], i) => (
        <rect
          key={i}
          className="pm-spark"
          x={7}
          y={0}
          width={1}
          height={1}
          fill={c}
          style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px` }}
        />
      ))}
    </svg>
  );
}
