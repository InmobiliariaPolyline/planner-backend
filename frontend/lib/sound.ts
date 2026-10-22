// Aviso sonoro suave para las notificaciones, generado con Web Audio (sin
// archivos): dos notas cortas y graves, con volumen bajo y desvanecimiento.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function playChime() {
  const ac = audio();
  if (!ac) return;
  // Los navegadores suspenden el audio hasta que la persona interactúa con la página.
  void ac.resume().catch(() => undefined);
  if (ac.state === "closed") return;

  const out = ac.createGain();
  out.gain.value = 0.9;
  const soften = ac.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 1800;
  out.connect(soften).connect(ac.destination);

  // Mi5 -> La5: intervalo de cuarta, amable y sin estridencia.
  [
    { freq: 659.25, at: 0, peak: 0.07 },
    { freq: 880, at: 0.14, peak: 0.055 },
  ].forEach(({ freq, at, peak }) => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    const t = ac.currentTime + at;
    osc.type = "sine";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 0.95);
  });
}
