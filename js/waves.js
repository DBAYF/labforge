// Wave definitions + spawn manager. 5 waves of escalating chaos. Each wave has
// a list of (typeKey, count, spawnIntervalSec) tuples. Wave manager spawns over
// time and signals "wave complete" when all queued spawns + alive enemies clear.

export const WAVES = [
  {
    n: 1,
    title: 'Drifting Dust',
    desc: 'Mars regolith drifts toward the greenhouse. Any tower in range will damage them, but at reduced efficiency — the right tool for pollution arrives later (Carbon Filter, v0.2).',
    spawns: [{ type: 'dust_cloud', count: 6, interval: 1.2 }],
  },
  {
    n: 2,
    title: 'Spore Bloom',
    desc: 'A fungal spore bloom enters the path. UV light shreds DNA — UV Sterilisers deal FULL damage here.',
    spawns: [{ type: 'crop_spore', count: 9, interval: 0.9 }],
  },
  {
    n: 3,
    title: 'Solar Storm',
    desc: 'Radiation bursts from a coronal ejection. Magnetic Emitters deflect charged particles at FULL damage; UV does only a fraction. Build a Magnetic Emitter or two.',
    spawns: [{ type: 'radiation_burst', count: 5, interval: 1.4 }],
  },
  {
    n: 4,
    title: 'Compound Threat',
    desc: 'Spores ride dust storms — biological + pollution. UV will tear through the spores at full damage; pollution takes glancing hits. Layer your defences along the path.',
    spawns: [
      { type: 'dust_cloud', count: 7, interval: 1.0 },
      { type: 'crop_spore', count: 10, interval: 0.7 },
    ],
  },
  {
    n: 5,
    title: 'System Crisis',
    desc: 'Everything at once: dust, spores AND radiation. Bright beams = full damage (matched type). Dim beams = glancing hit. Make sure solar arrays can power every active tower or watch the grid brown-out.',
    spawns: [
      { type: 'dust_cloud',      count: 8,  interval: 0.9 },
      { type: 'crop_spore',      count: 12, interval: 0.7 },
      { type: 'radiation_burst', count: 6,  interval: 1.0 },
    ],
  },
];

export class WaveManager {
  constructor(onSpawn) {
    this.onSpawn = onSpawn; // (typeKey) => void
    this.idx = -1; // current wave index; -1 = pre-game
    this.queue = [];
    this.timeUntilNext = 0;
    this.aliveCount = 0;
    this.waveActive = false;
    this.allClear = false;
  }

  startWave(idx) {
    if (idx < 0 || idx >= WAVES.length) return false;
    this.idx = idx;
    const w = WAVES[idx];
    this.queue = [];
    for (const s of w.spawns) {
      for (let i = 0; i < s.count; i++) this.queue.push({ type: s.type, delay: i * s.interval });
    }
    this.queue.sort((a, b) => a.delay - b.delay);
    this.timeUntilNext = this.queue[0]?.delay ?? 0;
    this.elapsed = 0;
    this.waveActive = true;
    this.allClear = false;
    return true;
  }

  // dt seconds. Returns true if any spawn happened.
  tick(dt) {
    if (!this.waveActive) return false;
    this.elapsed += dt;
    let spawned = false;
    while (this.queue.length && this.queue[0].delay <= this.elapsed) {
      const s = this.queue.shift();
      this.onSpawn(s.type);
      this.aliveCount++;
      spawned = true;
    }
    return spawned;
  }

  noteEnemyEnded() {
    this.aliveCount = Math.max(0, this.aliveCount - 1);
    if (this.waveActive && this.queue.length === 0 && this.aliveCount === 0) {
      this.waveActive = false;
      this.allClear = true;
    }
  }

  isAllClear() { return this.allClear; }
  hasNextWave() { return this.idx + 1 < WAVES.length; }
  current() { return this.idx >= 0 ? WAVES[this.idx] : null; }
  next()    { return this.hasNextWave() ? WAVES[this.idx + 1] : null; }
  total()   { return WAVES.length; }
}
