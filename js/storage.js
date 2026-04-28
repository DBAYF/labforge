// Local progress: high score (highest stability after final wave win), best wave
// reached on loss. Namespaced under labforge:* so we don't collide with other
// games on the same origin.

const NS = 'labforge:';

function safe() {
  try { return window.localStorage; } catch { return null; }
}

export function load() {
  const ls = safe();
  if (!ls) return { bestWave: 0, bestStability: 0, runs: 0, wins: 0 };
  try {
    const raw = ls.getItem(NS + 'profile');
    if (!raw) return { bestWave: 0, bestStability: 0, runs: 0, wins: 0 };
    return { bestWave: 0, bestStability: 0, runs: 0, wins: 0, ...JSON.parse(raw) };
  } catch {
    return { bestWave: 0, bestStability: 0, runs: 0, wins: 0 };
  }
}

export function save(profile) {
  const ls = safe();
  if (!ls) return;
  try { ls.setItem(NS + 'profile', JSON.stringify(profile)); } catch { /* */ }
}

export function recordRun({ won, wave, stability }) {
  const p = load();
  p.runs++;
  if (won) p.wins++;
  if (wave > p.bestWave) p.bestWave = wave;
  if (won && stability > p.bestStability) p.bestStability = stability;
  save(p);
  return p;
}
