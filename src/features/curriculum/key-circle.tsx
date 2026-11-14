import { CIRCLE, KEY_STATUS_LABEL, keyStatus, type KeyCoverage, type KeyStatus } from "@/lib/domain/keys";

const SIZE = 320;
const CENTER = SIZE / 2;
const RINGS = { major: [104, 152], minor: [58, 102] } as const;

function point(radius: number, degrees: number): string {
  const rad = (degrees * Math.PI) / 180;
  return `${(CENTER + radius * Math.cos(rad)).toFixed(2)} ${(CENTER + radius * Math.sin(rad)).toFixed(2)}`;
}

/** Secteur d'anneau centré sur `angle` (degrés, 0 = en haut), 30° de large. */
function sector(inner: number, outer: number, angle: number): string {
  const a0 = angle - 90 - 15;
  const a1 = angle - 90 + 15;
  return `M ${point(outer, a0)} A ${outer} ${outer} 0 0 1 ${point(outer, a1)} L ${point(inner, a1)} A ${inner} ${inner} 0 0 0 ${point(inner, a0)} Z`;
}

const FILL: Record<KeyStatus, string> = {
  never: "var(--bg)",
  started: "var(--mint)",
  installed: "var(--ink)",
};
const TEXT: Record<KeyStatus, string> = {
  never: "var(--ink-2)",
  started: "var(--ink)",
  installed: "var(--bg)",
};

function short(key: string, minor: boolean): string {
  const name = key.replace(/ (majeur|mineur)$/, "");
  return minor ? name.toLowerCase() : name;
}

/**
 * Cercle des quintes : majeures à l'extérieur, relatives mineures à l'intérieur.
 * Le statut est donné par la couleur ET par le texte (titre de chaque secteur, légende, liste).
 */
export function KeyCircle({ coverage }: { coverage: ReadonlyMap<string, KeyCoverage> }) {
  const cells = CIRCLE.flatMap((p) =>
    (["major", "minor"] as const).map((mode) => {
      const key = mode === "major" ? p.major : p.minor;
      const c = coverage.get(key);
      return { key, mode, angle: p.index * 30, status: keyStatus(c), sessions: c?.sessions ?? 0, signature: p.signature };
    }),
  );
  const practiced = cells.filter((c) => c.status !== "never").length;

  return (
    <figure className="max-w-[760px]">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block w-full max-w-[360px]"
        role="img"
        aria-label={`Cercle des quintes : ${practiced} tonalités travaillées sur 24.`}
      >
        {cells.map((c) => {
          const [inner, outer] = RINGS[c.mode];
          const mid = (inner + outer) / 2;
          const [x, y] = point(mid, c.angle - 90).split(" ");
          return (
            <g key={c.key}>
              <title>{`${c.key} (${c.signature}) — ${KEY_STATUS_LABEL[c.status]}${c.sessions ? `, ${c.sessions} séance${c.sessions > 1 ? "s" : ""}` : ""}`}</title>
              <path d={sector(inner, outer, c.angle)} fill={FILL[c.status]} stroke="var(--line)" strokeWidth={1.5} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={TEXT[c.status]}
                fontSize={c.mode === "major" ? 15 : 12}
                fontWeight={c.mode === "major" ? 700 : 500}
              >
                {short(c.key, c.mode === "minor")}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[15px] text-ink-2">
        {(Object.keys(KEY_STATUS_LABEL) as KeyStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <span aria-hidden className="size-3.5 rounded-[4px] border-[1.5px] border-line" style={{ background: FILL[s] }} />
            {KEY_STATUS_LABEL[s]}
          </span>
        ))}
        <span>Majeures à l’extérieur, mineures à l’intérieur</span>
      </figcaption>
    </figure>
  );
}
