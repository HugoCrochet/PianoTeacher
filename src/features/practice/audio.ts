/**
 * Son des outils de séance (Web Audio, côté navigateur uniquement).
 * Le contexte audio est créé au premier geste de l'utilisateur, comme l'exige Safari.
 */

let context: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;
    // Sur iPad, « playback » garde le son même si l'appareil est en mode silencieux.
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = "playback";
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(ctx: AudioContext, at: number, frequency: number, peak: number, length: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** Clic de métronome, programmé à l'instant `at` de l'horloge audio. */
export function click(ctx: AudioContext, at: number): void {
  tone(ctx, at, 1200, 0.5, 0.045, "square");
}

/** Signal doux de fin du temps prévu : deux notes montantes. */
export function chime(): void {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime + 0.02;
  tone(ctx, now, 660, 0.25, 0.5, "sine");
  tone(ctx, now + 0.25, 880, 0.25, 0.7, "sine");
}
