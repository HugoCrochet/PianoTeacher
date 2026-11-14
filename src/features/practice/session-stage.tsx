"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/* ---------- Mode pupitre : préférence propre à l'appareil ---------- */

const PUPITRE_KEY = "piano-coach:pupitre";
const PUPITRE_ZOOM = 1.35;
const listeners = new Set<() => void>();
let memory = false; // repli si le stockage du navigateur est indisponible

function readPupitre(): boolean {
  try {
    const stored = window.localStorage.getItem(PUPITRE_KEY);
    return stored === null ? memory : stored === "1";
  } catch {
    return memory;
  }
}

function writePupitre(on: boolean): void {
  memory = on;
  try {
    window.localStorage.setItem(PUPITRE_KEY, on ? "1" : "0");
  } catch {
    // stockage bloqué : la préférence vaut pour cette visite seulement
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/* ---------- Écran allumé ---------- */

function useScreenWakeLock(): void {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const request = async () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (disposed) void lock.release();
        else sentinel = lock;
      } catch {
        // refusé (batterie faible, réglage système…) : la séance fonctionne quand même
      }
    };

    void request();
    // Le verrou est relâché quand on quitte l'onglet : on le reprend au retour.
    const onVisible = () => void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
    };
  }, []);
}

/**
 * Cadre d'une séance en cours : garde l'écran allumé et applique le mode pupitre.
 */
export function SessionStage({ back, children }: { back: ReactNode; children: ReactNode }) {
  useScreenWakeLock();
  const pupitre = useSyncExternalStore(subscribe, readPupitre, () => false);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        {back}
        <Button
          type="button"
          variant={pupitre ? "selected" : "outline"}
          size="sm"
          aria-pressed={pupitre}
          onClick={() => writePupitre(!pupitre)}
        >
          Mode pupitre
        </Button>
      </div>
      <div style={pupitre ? { zoom: PUPITRE_ZOOM } : undefined} data-pupitre={pupitre ? "on" : "off"}>
        {children}
      </div>
    </>
  );
}
