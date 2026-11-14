import { cn } from "@/lib/utils";

/**
 * Difficulté de 1 à 5 en barres croissantes (style « signal »), annoncée en texte
 * aux lecteurs d'écran : l'information ne repose pas sur la seule forme.
 */
export function Difficulty({ level, className }: { level: number; className?: string }) {
  const label = `Difficulté ${level} sur 5`;
  return (
    <span role="img" aria-label={label} title={label} className={cn("inline-flex items-end gap-[3px] align-[-1px]", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={cn("w-[4px] rounded-full", i <= level ? "bg-ink" : "bg-ink-2/25")}
          style={{ height: 4 + i * 2 }}
        />
      ))}
    </span>
  );
}
