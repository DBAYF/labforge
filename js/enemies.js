// Enemy definitions + Enemy class. Path-following along PATH_WORLD waypoints.
// On reaching the greenhouse, deals damage to stability and despawns.

import * as THREE from 'three';
import { PATH_WORLD } from './grid.js';

export const ENEMY_DEFS = {
  dust_cloud: {
    type: 'pollution',
    name: 'Dust Cloud',
    hp: 38,
    speed: 4.6,
    damage: 5,
    reward: 8,
    color: 0x8b6f47,
    geom: 'sphere',
    scale: 1.0,
    desc: 'Slow drift of fine Mars regolith. Suffocates plants on contact.',
  },
  crop_spore: {
    type: 'biological',
    name: 'Crop Spore',
    hp: 22,
    speed: 6.4,
    damage: 8,
    reward: 12,
    color: 0x6ee07a,
    geom: 'icosahedron',
    scale: 0.7,
    desc: 'Fast-replicating fungal spore. UV light shreds its DNA.',
  },
  radiation_burst: {
    type: 'radiation',
    name: 'Radiation Burst',
    hp: 18,
    speed: 9.2,
    damage: 14,
    reward: 18,
    color: 0xfde047,
    geom: 'cone',
    scale: 0.8,
    desc: 'Charged particle volley from a solar storm. Magnetic fields deflect it.',
  },
};

export class Enemy {
  constructor(typeKey) {
    this.def = { ...ENEMY_DEFS[typeKey], type: ENEMY_DEFS[typeKey].type };
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
    this.alive = true;
    this.reachedGoal = false;
    this.waypointIdx = 0;
    this.pos = PATH_WORLD[0].clone();

    this.mesh = this._buildMesh();
    this.mesh.position.copy(this.pos);
  }

  _buildMesh() {
    const c = this.def.color;
    let geom;
    if (this.def.geom === 'sphere') geom = new THREE.SphereGeometry(0.7 * this.def.scale, 12, 8);
    else if (this.def.geom === 'icosahedron') geom = new THREE.IcosahedronGeometry(0.7 * this.def.scale, 0);
    else if (this.def.geom === 'cone') geom = new THREE.ConeGeometry(0.55 * this.def.scale, 1.2 * this.def.scale, 8);
    else geom = new THREE.SphereGeometry(0.6, 8, 6);

    const mat = new THREE.MeshStandardMaterial({
      color: c, emissive: c, emissiveIntensity: 0.55,
      transparent: this.def.type === 'pollution',
      opacity: this.def.type === 'pollution' ? 0.78 : 1.0,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.9;

    const group = new THREE.Group();
    group.add(mesh);
    this._mainMesh = mesh;
    return group;
  }

  // Advance along the path. Returns true if the enemy reached the goal this tick.
  tick(dt) {
    if (!this.alive) return false;
    let remaining = this.def.speed * dt;
    while (remaining > 0 && this.waypointIdx < PATH_WORLD.length - 1) {
      const next = PATH_WORLD[this.waypointIdx + 1];
      const dir = next.clone().sub(this.pos);
      const dist = dir.length();
      if (dist <= remaining) {
        this.pos.copy(next);
        this.waypointIdx++;
        remaining -= dist;
      } else {
        this.pos.add(dir.normalize().multiplyScalar(remaining));
        remaining = 0;
      }
    }
    this.mesh.position.copy(this.pos);
    this.mesh.position.y = 0.9 + Math.sin(performance.now() * 0.005 + this.maxHp) * 0.15;
    // Spin for visual flair on biological/radiation
    if (this.def.type !== 'pollution') {
      this._mainMesh.rotation.y += dt * 1.4;
      this._mainMesh.rotation.x += dt * 0.6;
    }

    if (this.waypointIdx >= PATH_WORLD.length - 1) {
      this.reachedGoal = true;
      this.alive = false;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    // brief flash via emissive boost
    this._mainMesh.material.emissiveIntensity = 1.6;
    if (this.hp <= 0) this.alive = false;
  }

  // call each frame after damage to relax flash
  relaxFlash(dt) {
    if (!this._mainMesh.material) return;
    this._mainMesh.material.emissiveIntensity = Math.max(0.55, this._mainMesh.material.emissiveIntensity - dt * 4);
  }

  dispose() {
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
