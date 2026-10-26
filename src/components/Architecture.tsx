/** Line-art city architecture drawn in code (no images). */
function Windows({ x, y, cols, rows, w = 10, h = 14, gx = 8, gy = 12 }: { x: number; y: number; cols: number; rows: number; w?: number; h?: number; gx?: number; gy?: number }) {
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(<rect key={`${r}-${c}`} x={x + c * (w + gx)} y={y + r * (h + gy)} width={w} height={h} />);
  return <>{out}</>;
}

function LeftScene() {
  return (
    <svg viewBox="0 0 320 900" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.2">
      {/* tall apartment tower */}
      <rect x="40" y="120" width="130" height="700" />
      <path d="M40 120 L105 70 L170 120" />
      <line x1="105" y1="70" x2="105" y2="30" />
      <Windows x={56} y={150} cols={5} rows={22} w={12} h={16} gx={10} gy={14} />
      <rect x="85" y="760" width="40" height="60" />
      {/* brownstone */}
      <rect x="170" y="480" width="120" height="340" />
      <path d="M160 480 H300" />
      <path d="M165 470 H295" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <path key={`${r}${c}`} d={`M${185 + c * 36} ${560 + r * 70} v-26 a12 12 0 0 1 24 0 v26 z`} />
        )),
      )}
      <path d="M210 820 v-50 a20 20 0 0 1 40 0 v50" />
      <path d="M200 820 l-10 20 h80 l-10 -20" />
      <line x1="0" y1="840" x2="320" y2="840" />
    </svg>
  );
}

function RightScene() {
  return (
    <svg viewBox="0 0 320 900" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.2">
      {/* suburban house */}
      <path d="M30 600 L130 510 L230 600" />
      <rect x="50" y="600" width="160" height="220" />
      <rect x="160" y="530" width="20" height="40" />
      <rect x="70" y="630" width="40" height="40" />
      <line x1="90" y1="630" x2="90" y2="670" />
      <line x1="70" y1="650" x2="110" y2="650" />
      <rect x="150" y="740" width="40" height="80" />
      <circle cx="182" cy="782" r="2" />
      <path d="M70 700 h40 v40 h-40 z M90 700 v40" />
      {/* modern mid-rise */}
      <rect x="220" y="200" width="90" height="620" />
      <Windows x={232} y={220} cols={3} rows={20} w={16} h={18} gx={8} gy={11} />
      {/* balcony lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="212" y1={300 + i * 110} x2="318" y2={300 + i * 110} />
      ))}
      {/* key + tag */}
      <circle cx="120" cy="300" r="22" />
      <circle cx="120" cy="300" r="8" />
      <path d="M142 300 H200 M180 300 v14 M192 300 v10" />
      {/* tree */}
      <circle cx="20" cy="740" r="22" />
      <line x1="20" y1="762" x2="20" y2="840" />
      <line x1="0" y1="840" x2="320" y2="840" />
    </svg>
  );
}

export function Architecture({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-6 hidden h-[900px] w-[300px] text-primary/25 lg:block ${
        side === "left" ? "left-[max(0px,calc(50%-36rem))]" : "right-[max(0px,calc(50%-36rem))]"
      }`}
    >
      {side === "left" ? <LeftScene /> : <RightScene />}
    </div>
  );
}
