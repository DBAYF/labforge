// LabForge TD — main game loop. Composes Scene + Towers + Enemies + Waves + HUD.
// Static module. No bundler. Three.js via importmap.

import * as THREE from 'three';
import { Scene } from './scene.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { TOWER_DEFS, Tower } from './towers.js';
import { Enemy } from './enemies.js';
import { WaveManager, WAVES } from './waves.js';
import { tileToWorld, isPathTile, inBounds } from './grid.js';
import { sfx, unlockAudio } from './audio.js';
import { load as loadProfile, recordRun } from './storage.js';

class Game {
  constructor() {
    const canvas = document.getElementById('bv-canvas');
    this.scene = new Scene(canvas);
    this.input = new Input(this.scene, canvas);
    this.hud = new HUD();

    // Game state
    this.researchPoints = 300;
    this.energy = 100;        // current banked energy
    this.energyCap = 200;     // soft cap (visible)
    this.stability = 100;
    this.towers = [];
    this.enemies = [];
    this.tilesOccupied = new Set(); // keys "tx,ty"
    this.selectedKind = null;       // tower kind currently armed for placement
    this.lastT = performance.now();
    this.running = true;

    // Wave manager — onSpawn → push enemy
    this.waveMgr = new WaveManager((typeKey) => {
      const e = new Enemy(typeKey);
      this.enemies.push(e);
      this.scene.three.add(e.mesh);
    });

    // Hover preview ghost (shows where a tower will go before click)
    this.ghost = this._makeGhost();
    this.scene.three.add(this.ghost);
    this.ghost.visible = false;

    this._wireInput();
    this._wireHud();

    this.hud.setStability(this.stability);
    this.hud.setEnergy(this.energy);
    this.hud.setResearch(this.researchPoints);
    this.hud.setWave(0, this.waveMgr.total());

    this._beginWaveFlow(0);

    requestAnimationFrame(this._tick.bind(this));
  }

  _makeGhost() {
    const g = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.05, 3.4),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.35 }),
    );
    g.position.y = 0.06;
    return g;
  }

  _wireInput() {
    const canvas = this.scene.canvas;
    canvas.addEventListener('pointermove', (e) => {
      if (!this.selectedKind) { this.ghost.visible = false; return; }
      const t = this.input.pickTile(e);
      if (!t) { this.ghost.visible = false; return; }
      const occupied = this.tilesOccupied.has(`${t.tx},${t.ty}`);
      const isPath = isPathTile(t.tx, t.ty);
      const valid = !occupied && !isPath;
      this.ghost.visible = true;
      this.ghost.material.color.setHex(valid ? 0x4ade80 : 0xef4444);
      this.ghost.position.copy(tileToWorld(t.tx, t.ty));
      this.ghost.position.y = 0.06;
    });

    canvas.addEventListener('pointerdown', (e) => {
      unlockAudio();
      if (!this.selectedKind) return;
      const t = this.input.pickTile(e);
      if (!t) return;
      this._placeTower(t.tx, t.ty);
    });

    // Cancel with Escape or right-click
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._setSelected(null);
    });
  }

  _wireHud() {
    this.hud.bindTowerPick((kind) => {
      unlockAudio();
      this._setSelected(this.selectedKind === kind ? null : kind);
    });
  }

  _setSelected(kind) {
    if (kind && this.researchPoints < TOWER_DEFS[kind].cost) {
      // can't afford — refuse
      kind = null;
    }
    this.selectedKind = kind;
    this.hud.setSelected(kind);
    this.scene.canvas.classList.toggle('build-cursor', !!kind);
    if (!kind) this.ghost.visible = false;
  }

  _placeTower(tx, ty) {
    if (!inBounds(tx, ty)) return;
    if (isPathTile(tx, ty)) return;
    const key = `${tx},${ty}`;
    if (this.tilesOccupied.has(key)) return;
    const def = TOWER_DEFS[this.selectedKind];
    if (!def) return;
    if (this.researchPoints < def.cost) return;

    this.researchPoints -= def.cost;
    const t = new Tower(def, tileToWorld(tx, ty));
    this.scene.three.add(t.group);
    this.towers.push(t);
    this.tilesOccupied.add(key);
    this.hud.setResearch(this.researchPoints);
    sfx.place();

    // If can't afford another of same kind, deselect
    if (this.researchPoints < def.cost) this._setSelected(null);
  }

  async _beginWaveFlow(idx) {
    const w = WAVES[idx];
    if (!w) return this._finish(true);
    await this.hud.showBrief(`Wave ${w.n}: ${w.title}`, w.desc);
    if (this._finished) return; // game ended while we were waiting
    this.waveMgr.startWave(idx);
    this.hud.setWave(w.n, this.waveMgr.total());
  }

  _finish(won) {
    if (this._finished) return; // hard guard — fire only once
    this._finished = true;
    this.running = false;
    if (won) sfx.win(); else sfx.lose();
    let profile = { bestWave: 0, bestStability: 0 };
    try {
      profile = recordRun({ won, wave: this.waveMgr.idx + 1, stability: this.stability });
    } catch (e) { console.warn('storage failed', e); }
    this.hud.showFinale(won, {
      'STABILITY': `${Math.round(this.stability)}%`,
      'WAVE REACHED': `${this.waveMgr.idx + 1} / ${this.waveMgr.total()}`,
      'TOWERS BUILT': this.towers.length,
      'BEST RUN': `W${profile.bestWave} · ${profile.bestStability}%`,
    });
  }

  // ─── Per-frame tick ───
  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastT) * 0.001);
    this.lastT = now;

    // Wave manager spawns
    this.waveMgr.tick(dt);

    // Towers tick — energy delta accumulates
    let energyDelta = 0;
    // First pass: figure out total energy demand vs current to compute brown-out
    let demand = 0, supply = 0;
    for (const t of this.towers) {
      if (t.def.energyDraw < 0) supply += -t.def.energyDraw;
      else demand += t.def.energyDraw;
    }
    // Soft brown-out: if demand > supply AND banked energy is empty, weakest towers go offline.
    // Simple v1: if banked energy is 0, all attack towers offline; with banked energy they stay on.
    const brownOut = this.energy <= 0 && demand > supply;
    for (const t of this.towers) {
      if (t.def.energyDraw > 0) t.setOnline(!brownOut);
      energyDelta += t.tick(dt, this.enemies);
    }

    // Update banked energy with delta
    this.energy = Math.min(this.energyCap, Math.max(0, this.energy + energyDelta));
    this.hud.setEnergy(this.energy);

    // Enemies tick
    let killedCount = 0;
    let reachedCount = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const reached = e.tick(dt);
      e.relaxFlash(dt);
      if (reached) {
        this.stability -= e.def.damage;
        reachedCount++;
        sfx.hit();
        this.enemies.splice(i, 1);
        this.scene.three.remove(e.mesh);
        e.dispose();
        this.waveMgr.noteEnemyEnded();
      } else if (!e.alive) {
        this.researchPoints += e.def.reward;
        killedCount++;
        sfx.kill();
        this.enemies.splice(i, 1);
        this.scene.three.remove(e.mesh);
        e.dispose();
        this.waveMgr.noteEnemyEnded();
      }
    }
    if (killedCount > 0 || reachedCount > 0) {
      this.hud.setResearch(this.researchPoints);
      this.hud.setStability(this.stability);
    }

    // Win/lose checks
    if (this.stability <= 0) {
      return this._finish(false);
    }
    // Inter-wave transition — guarded so it only fires ONCE per cleared wave,
    // not every frame while we're awaiting the briefing click.
    if (this.waveMgr.isAllClear() && !this._transitioning) {
      this._transitioning = true;
      const next = this.waveMgr.idx + 1;
      if (next >= WAVES.length) {
        return this._finish(true);
      }
      this.researchPoints += 80;
      this.hud.setResearch(this.researchPoints);
      this.energy = Math.min(this.energyCap, this.energy + 30);
      this.hud.setEnergy(this.energy);
      this._beginWaveFlow(next).then(() => {
        // startWave() inside _beginWaveFlow flips allClear false → tick can resume normally.
        this._transitioning = false;
        this.lastT = performance.now();
      });
    }

    this.scene.render();
    requestAnimationFrame(this._tick.bind(this));
  }
}

new Game();
