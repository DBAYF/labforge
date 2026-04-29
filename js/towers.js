// Tower definitions + Tower runtime class. Pure data + a small constructor that
// builds Three.js meshes per tower kind. Combat fires on Game.tick().

import * as THREE from 'three';

// ─── Tower definitions (the educational catalog) ───
// kind:        identifier
// name:        display
// role:        one-liner role
// stem:        STEM concept the tower teaches
// cost:        research points to build
// energyDraw:  energy/sec when active (negative = generates energy)
// range:       world-units
// dps:         damage per second to valid targets
// targets:     enemy types this tower attacks ('biological' | 'pollution' | 'radiation' | null)
// color:       hex CSS string
// hexColor:    hex number for Three.js
//
// SOLAR_ARRAY is a generator: no targets, energyDraw is negative.

export const TOWER_DEFS = {
  SOLAR_ARRAY: {
    kind: 'SOLAR_ARRAY',
    name: 'Solar Array',
    role: 'Generates energy for nearby towers.',
    stem: 'Solar generation · efficiency · grid load',
    cost: 60,
    energyDraw: -2.0,
    range: 0,
    dps: 0,
    targets: null,
    color: '#fbbf24',
    hexColor: 0xfbbf24,
  },
  UV_STERILISER: {
    kind: 'UV_STERILISER',
    name: 'UV Steriliser',
    role: 'DNA-disruption beam against biological enemies.',
    stem: 'UV light · DNA damage · sterilisation dose',
    cost: 80,
    energyDraw: 5.0,
    range: 16,
    dps: 14,
    targets: ['biological'],
    color: '#06b6d4',
    hexColor: 0x06b6d4,
  },
  MAGNETIC_EMITTER: {
    kind: 'MAGNETIC_EMITTER',
    name: 'Magnetic Emitter',
    role: 'Deflects charged particles & radiation bursts.',
    stem: 'Electromagnetism · charged particles · shielding',
    cost: 120,
    energyDraw: 7.0,
    range: 14,
    dps: 22,
    targets: ['radiation'],
    color: '#a78bfa',
    hexColor: 0xa78bfa,
  },
};

export const TOWER_ORDER = ['SOLAR_ARRAY', 'UV_STERILISER', 'MAGNETIC_EMITTER'];

// ─── Runtime tower class ───
export class Tower {
  constructor(def, pos) {
    this.def = def;
    this.pos = pos.clone();
    this.fireCooldown = 0;
    this.beamTimer = 0;
    this.target = null;
    this.online = true; // false when grid is brown-out

    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this._buildMesh();
  }

  _buildMesh() {
    const c = this.def.hexColor;
    if (this.def.kind === 'SOLAR_ARRAY') {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.6, roughness: 0.4 }),
      );
      post.position.y = 0.6;
      this.group.add(post);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.08, 1.4),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, metalness: 0.7, roughness: 0.3 }),
      );
      panel.position.y = 1.3;
      panel.rotation.x = -0.5;
      this.group.add(panel);
      // grid lines on the panel
      const grid = new THREE.GridHelper(2.0, 4, 0xffffff, 0xffffff);
      grid.material.opacity = 0.25;
      grid.material.transparent = true;
      grid.position.y = 1.36;
      grid.rotation.x = -0.5;
      this.group.add(grid);
    } else if (this.def.kind === 'UV_STERILISER') {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.4, 2.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.5, roughness: 0.4 }),
      );
      stalk.position.y = 1.0;
      this.group.add(stalk);
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.6, 12),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 }),
      );
      lamp.position.y = 2.2;
      this.group.add(lamp);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.06, 6, 18),
        new THREE.MeshBasicMaterial({ color: c }),
      );
      ring.position.y = 2.55;
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
      // Beam line — visible during fire
      const beamGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const beamMat = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0 });
      this.beam = new THREE.Line(beamGeom, beamMat);
      this.group.add(this.beam);
    } else if (this.def.kind === 'MAGNETIC_EMITTER') {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.7, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x2a1a3a, metalness: 0.5, roughness: 0.3 }),
      );
      base.position.y = 0.2;
      this.group.add(base);
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.18, 8, 24),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 }),
      );
      torus.position.y = 1.3;
      torus.rotation.x = Math.PI / 2;
      this.group.add(torus);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 12),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 }),
      );
      core.position.y = 1.3;
      this.group.add(core);
      this.coreMesh = core; // for pulse animation
      const beamGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const beamMat = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0 });
      this.beam = new THREE.Line(beamGeom, beamMat);
      this.group.add(this.beam);
    }
  }

  // Per-frame update. Returns total energy delta this tick (signed).
  // Combat fires inside game loop with access to all enemies.
  tick(dt, enemies) {
    // Generators
    if (this.def.energyDraw < 0) return -this.def.energyDraw * dt; // positive return = energy added

    // If brown-out, no firing.
    if (!this.online) {
      if (this.beam) this.beam.material.opacity = 0;
      return 0;
    }

    const energySpent = this.def.energyDraw * dt; // positive = spent

    // Generators have no targets list → return early before scanning enemies.
    if (!this.def.targets) {
      if (this.beam) this.beam.material.opacity = 0;
      return -energySpent;
    }

    // Pick the closest enemy IN RANGE — any type. Damage gets a 1.0× multiplier
    // if the enemy type matches the tower's preferred-target list, 0.4× otherwise.
    // This means every tower is at least somewhat useful against everything,
    // while the STEM identity (UV best vs bio, Magnetic best vs radiation) holds.
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(this.pos);
      if (d <= this.def.range && d < bestDist) { bestDist = d; best = e; }
    }
    this.target = best;

    if (best) {
      const matched = this.def.targets.includes(best.def.type);
      const mul = matched ? 1.0 : 0.4;
      best.takeDamage(this.def.dps * mul * dt);
      this._drawBeam(best.pos, matched);
      if (this.coreMesh) {
        this.coreMesh.scale.setScalar(1 + Math.sin(performance.now() * 0.012) * 0.12);
      }
    } else {
      if (this.beam) this.beam.material.opacity = 0;
      if (this.coreMesh) this.coreMesh.scale.setScalar(1);
    }

    return -energySpent; // negative because spent
  }

  _drawBeam(targetPos, matched = true) {
    if (!this.beam) return;
    const geom = this.beam.geometry;
    const arr = geom.attributes.position.array;
    const start = this.pos.clone();
    start.y = this.def.kind === 'UV_STERILISER' ? 2.4 : 1.3;
    arr[0] = start.x; arr[1] = start.y; arr[2] = start.z;
    arr[3] = targetPos.x; arr[4] = targetPos.y + 0.6; arr[5] = targetPos.z;
    geom.attributes.position.needsUpdate = true;
    // Bright beam against preferred type, dim when shooting off-type.
    this.beam.material.opacity = matched ? 0.85 : 0.35;
  }

  setOnline(on) {
    this.online = on;
    // dim emissive for offline
    this.group.traverse((o) => {
      if (o.material && o.material.emissive) {
        o.material.emissiveIntensity = on ? (this.def.kind === 'SOLAR_ARRAY' ? 0.55 : 1.0) : 0.05;
      }
    });
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
}
