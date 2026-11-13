"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/action";
import type { PracticeResult } from "@/lib/domain/domains";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Label } from "@/components/ui/field";
import { recordResult } from "./server/actions";

/**
 * Saisie du résultat d'une tâche. Le choix « Réussi » / « À retravailler » reste
 * modifiable tant que « Valider » n'est pas pressé.
 */
export function ResultForm({
  taskId,
  plannedMinutes,
  targetBpm,
  showBpm,
}: {
  taskId: string;
  plannedMinutes: number;
  targetBpm: number | null;
  showBpm: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordResult, null);
  const [result, setResult] = useState<PracticeResult | null>(null);

  return (
    <form action={action} className="mt-7 max-w-[760px]">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="result" value={result ?? ""} />

      <div role="group" aria-label="Résultat" className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={result === "success" ? "selected" : "outline"}
          aria-pressed={result === "success"}
          onClick={() => setResult("success")}
        >
          {result === "success" ? "✓ " : ""}Réussi
        </Button>
        <Button
          type="button"
          variant={result === "retry" ? "selected" : "outline"}
          aria-pressed={result === "retry"}
          onClick={() => setResult("retry")}
        >
          {result === "retry" ? "✓ " : ""}À retravailler
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-4">
        {showBpm ? (
          <div className="w-44">
            <Label htmlFor="bpm">BPM atteint (optionnel)</Label>
            <Input
              id="bpm"
              name="bpm"
              type="number"
              inputMode="numeric"
              min={20}
              max={300}
              placeholder={targetBpm ? String(targetBpm) : "—"}
            />
          </div>
        ) : null}
        <div className="w-44">
          <Label htmlFor="minutes">Durée réelle (min)</Label>
          <Input
            id="minutes"
            name="minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={180}
            defaultValue={plannedMinutes}
            required
          />
        </div>
      </div>

      <Button type="submit" className="mt-6" disabled={pending || result === null} aria-busy={pending}>
        {pending ? "Enregistrement…" : "Valider et continuer"}
      </Button>
      {result === null ? (
        <p className="mt-2 text-[15px] text-ink-2">Choisis un résultat pour valider.</p>
      ) : null}
      <FormMessage kind="error">{state && !state.ok ? state.message : null}</FormMessage>
    </form>
  );
}
