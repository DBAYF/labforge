// Wave definitions + spawn manager. 5 waves of escalating chaos. Each wave has
// a list of (typeKey, count, spawnIntervalSec) tuples. Wave manager spawns over
// time and signals "wave complete" when all queued spawns + alive enemies clear.

export const WAVES = [
  {
    n: 1,
    title: 'Drifting Dust',
    desc: 'Mars regolith drifts toward the greenhouse. Place a UV Steriliser? No — these are not biological. Filtration would ideally help, but for now: any tower in range will work via its physical presence. Your job is to stop them at the greenhouse.',
    spawns: [{ type: 'dust_cloud', count: 6, interval: 1.2 }],
  },
  {
    n: 2,
    title: 'Spore Bloom',
    desc: 'A fungal spore bloom enters the path. UV light disrupts their DNA — deploy UV Sterilisers along the route.',
    spawns: [{ type: 'crop_spore', count: 9, interval: 0.9 }],
  },
  {
    n: 3,
    title: 'Solar Storm',
    desc: 'Radiation bursts from a solar coronal ejection. Magnetic Emitters deflect charged particles — UV is useless against radiation.',
    spawns: [{ type: 'radiation_burst', count: 5, interval: 1.4 }],
  },
  {
    n: 4,
    title: 'Compound Threat',
    desc: 'Spores ride dust storms — a mixed biological + pollution wave. Layer your defences along the path.',
    spawns: [
      { type: 'dust_cloud', count: 7, interval: 1.0 },
      { type: 'crop_spore', count: 10, interval: 0.7 },
    ],
  },
  {
    n: 5,
    title: 'System Crisis',
    desc: 'Everything at once: dust, spores, AND a radiation burst behind. Energy will spike — make sure your solar arrays can power every active tower.',
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
