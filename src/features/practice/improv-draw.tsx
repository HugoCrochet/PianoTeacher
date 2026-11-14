"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { List, Row } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import type { KeyStatus } from "@/lib/domain/keys";
import {
  POOL_BASIS_LABEL,
  circleKey,
  drawPool,
  drawProgression,
  type CountChoice,
  type Draw,
  type ModeChoice,
} from "./domain/random-progression";

const MODES: { value: ModeChoice; label: string }[] = [
  { value: "any", label: "Au hasard" },
  { value: "major", label: "Majeur" },
  { value: "minor", label: "Mineur" },
];
const COUNTS: { value: CountChoice; label: string }[] = [
  { value: "any", label: "3 ou 4" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

function Choice<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[15px] text-ink-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={String(o.value)}
            type="button"
            size="sm"
            variant={value === o.value ? "selected" : "outline"}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Tirage d'une tonalité et d'une progression pour improviser. Par défaut, seulement dans
 * les tonalités maîtrisées ; la case « Essayer aussi d'autres tonalités » ouvre les 24.
 * `statuses` : statut de chaque tonalité, écrite comme dans le cercle du parcours.
 */
export function ImprovDraw({ statuses, compact = false }: { statuses: Record<string, KeyStatus>; compact?: boolean }) {
  const [mode, setMode] = useState<ModeChoice>("any");
  const [count, setCount] = useState<CountChoice>("any");
  const [explore, setExplore] = useState(false);
  const [draw, setDraw] = useState<Draw | null>(null);

  const pool = drawPool((k) => statuses[k] ?? "never", explore);
  const status = draw ? (statuses[circleKey(draw.key)] ?? "never") : null;

  return (
    <div className="max-w-[760px]">
      {!compact ? (
        <div className="mb-5 flex flex-wrap gap-6">
          <Choice legend="Mode" options={MODES} value={mode} onChange={setMode} />
          <Choice legend="Nombre d’accords" options={COUNTS} value={count} onChange={setCount} />
        </div>
      ) : null}
      <label className="flex min-h-11 items-center gap-3 text-[17px]">
        <input
          type="checkbox"
          className="size-5 accent-ink"
          checked={explore}
          onChange={(e) => setExplore(e.target.checked)}
        />
        Essayer aussi d’autres tonalités
      </label>
      <p className="mt-1 text-[15px] text-ink-2">
        Tirage {POOL_BASIS_LABEL[pool.basis]}
        {pool.basis === "installed" || pool.basis === "started" ? ` (${pool.keys.length})` : ""}.
      </p>

      <Button
        type="button"
        size={compact ? "md" : "lg"}
        variant={compact ? "outline" : "primary"}
        className="mt-4"
        onClick={() => setDraw(drawProgression(Math.random, { mode, count, allowedKeys: pool.keys }))}
      >
        <Shuffle size={18} aria-hidden />
        {draw ? "Nouveau tirage" : compact ? "Tirer une grille au hasard" : "Tirer"}
      </Button>

      <div aria-live="polite">
        {draw ? (
          <List className="mt-6">
            <Row
              main="Tonalité"
              detail={status === "installed" ? "Bien installée" : status === "started" ? "Déjà travaillée" : "Nouvelle pour toi"}
              meta={<span className="text-[22px] font-bold text-ink">{draw.key}</span>}
            />
            <Row
              main="Progression"
              detail={draw.chords.map((c) => c.roman).join("–")}
              meta={<span className="text-[22px] font-bold text-ink">{draw.chords.map((c) => c.name).join(" | ")}</span>}
            />
            <Row main="Gamme" detail={draw.scale.join(" – ")} />
          </List>
        ) : null}
      </div>
    </div>
  );
}
