// Tiny Web Audio engine. Three short SFX: fire, hit, finale. Lazy-init on first
// user gesture (browser autoplay policy).

let ctx = null;
let unlocked = false;

function ensureCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function unlockAudio() {
  if (unlocked) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  unlocked = true;
}

function blip({ freq = 440, type = 'sine', duration = 0.12, gain = 0.08 } = {}) {
  if (!unlocked) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch (e) { /* ignore */ }
}

export const sfx = {
  place: () => blip({ freq: 660, type: 'triangle', duration: 0.18, gain: 0.06 }),
  fire:  () => blip({ freq: 880, type: 'square',   duration: 0.05, gain: 0.03 }),
  kill:  () => blip({ freq: 220, type: 'square',   duration: 0.18, gain: 0.05 }),
  hit:   () => blip({ freq: 110, type: 'sawtooth', duration: 0.12, gain: 0.06 }),
  win:   () => { blip({ freq: 523, duration: 0.18, gain: 0.08, type: 'triangle' }); setTimeout(() => blip({ freq: 659, duration: 0.18, gain: 0.08, type: 'triangle' }), 180); setTimeout(() => blip({ freq: 784, duration: 0.32, gain: 0.08, type: 'triangle' }), 360); },
  lose:  () => { blip({ freq: 220, duration: 0.4, gain: 0.10, type: 'sawtooth' }); setTimeout(() => blip({ freq: 110, duration: 0.6, gain: 0.10, type: 'sawtooth' }), 200); },
};
