"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, RotateCcw, Square } from "lucide-react";
import { List, Row } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { chime, click, getAudio } from "./audio";
import {
  METRONOME_DEFAULT_BPM,
  METRONOME_MAX_BPM,
  METRONOME_MIN_BPM,
  beatSeconds,
  clampBpm,
  formatClock,
  remainingSeconds,
} from "./domain/session-tools";
import { ResultForm } from "./result-form";

const BPM_STEP = 2;

/** Minuteur : temps écoulé mesuré par l'horloge système, donc juste même si l'onglet a été mis en arrière-plan. */
function useTimer(plannedMinutes: number) {
  const [running, setRunning] = useState(false);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const rang = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const elapsedSeconds = Math.floor((accumulatedMs + (startedAt !== null ? Math.max(0, now - startedAt) : 0)) / 1000);
  const remaining = remainingSeconds(plannedMinutes, elapsedSeconds);

  useEffect(() => {
    if (running && remaining <= 0 && !rang.current) {
      rang.current = true;
      chime();
    }
  }, [running, remaining]);

  return {
    running,
    elapsedSeconds,
    remaining,
    toggle() {
      getAudio(); // prépare le son de fin pendant le geste de l'utilisateur
      const t = Date.now();
      if (running && startedAt !== null) {
        setAccumulatedMs((ms) => ms + (t - startedAt));
        setStartedAt(null);
        setRunning(false);
      } else {
        setStartedAt(t);
        setNow(t);
        setRunning(true);
      }
    },
    reset() {
      rang.current = false;
      setRunning(false);
      setStartedAt(null);
      setAccumulatedMs(0);
    },
  };
}

/** Métronome Web Audio : les clics sont programmés à l'avance sur l'horloge audio, pour un tempo stable. */
function useMetronome(initialBpm: number | null) {
  const [bpm, setBpm] = useState(clampBpm(initialBpm ?? METRONOME_DEFAULT_BPM));
  const [playing, setPlaying] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    if (!playing) return;
    const ctx = getAudio();
    if (!ctx) return;
    let next = ctx.currentTime + 0.06;
    const id = window.setInterval(() => {
      // Après une mise en arrière-plan, on repart de maintenant au lieu de rattraper les clics manqués.
      if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
      while (next < ctx.currentTime + 0.12) {
        click(ctx, next);
        next += beatSeconds(bpmRef.current);
      }
    }, 25);
    return () => window.clearInterval(id);
  }, [playing]);

  return {
    bpm,
    playing,
    unsupported,
    toggle() {
      if (!playing && !getAudio()) {
        setUnsupported(true);
        return;
      }
      setPlaying((p) => !p);
    },
    change(delta: number) {
      setBpm((b) => clampBpm(b + delta));
    },
  };
}

/**
 * Poste de travail d'une tâche : minuteur, métronome et saisie du résultat.
 * Remonté à chaque tâche (clé = id), ce qui arrête le métronome et remet le minuteur à zéro.
 */
export function SessionDesk({
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
  const timer = useTimer(plannedMinutes);
  const metronome = useMetronome(targetBpm);
  const over = timer.remaining <= 0;
  const started = timer.running || timer.elapsedSeconds > 0;

  return (
    <>
      <List className="mt-7">
        <Row
          main="Minuteur"
          detail={
            <span aria-live="polite">
              {over ? "Temps prévu écoulé, continue si tu veux" : timer.running ? "En cours" : started ? "En pause" : `${plannedMinutes} min prévues`}
            </span>
          }
          meta={
            <span role="timer" aria-label="Temps restant" className="text-[28px] font-bold text-ink tabular-nums">
              {formatClock(timer.remaining)}
            </span>
          }
        >
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" variant="outline" size="sm" onClick={timer.toggle}>
              {timer.running ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
              {timer.running ? "Pause" : started ? "Reprendre" : "Démarrer"}
            </Button>
            {started ? (
              <Button type="button" variant="ghost" size="sm" onClick={timer.reset}>
                <RotateCcw size={18} aria-hidden />
                Remettre à zéro
              </Button>
            ) : null}
          </div>
        </Row>

        <Row
          main="Métronome"
          detail={
            metronome.unsupported
              ? "Le son n’est pas disponible dans ce navigateur."
              : targetBpm
                ? `Tempo visé : ${targetBpm} BPM`
                : "Tempo libre"
          }
          meta={
            <span className="text-[28px] font-bold text-ink tabular-nums">
              {metronome.bpm}
              <span className="ml-1 text-base font-normal text-ink-2">BPM</span>
            </span>
          }
        >
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-11 px-0"
              aria-label={`Ralentir de ${BPM_STEP} BPM`}
              disabled={metronome.bpm <= METRONOME_MIN_BPM}
              onClick={() => metronome.change(-BPM_STEP)}
            >
              <Minus size={18} aria-hidden />
            </Button>
            <Button
              type="button"
              variant={metronome.playing ? "selected" : "outline"}
              size="sm"
              aria-pressed={metronome.playing}
              onClick={metronome.toggle}
            >
              {metronome.playing ? <Square size={16} aria-hidden /> : <Play size={18} aria-hidden />}
              {metronome.playing ? "Arrêter" : "Lancer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-11 px-0"
              aria-label={`Accélérer de ${BPM_STEP} BPM`}
              disabled={metronome.bpm >= METRONOME_MAX_BPM}
              onClick={() => metronome.change(BPM_STEP)}
            >
              <Plus size={18} aria-hidden />
            </Button>
          </div>
        </Row>
      </List>

      <ResultForm
        taskId={taskId}
        plannedMinutes={plannedMinutes}
        targetBpm={targetBpm}
        showBpm={showBpm}
        measuredSeconds={timer.elapsedSeconds}
      />
    </>
  );
}
