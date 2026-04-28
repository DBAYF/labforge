// Mouse / touch picking. Translates a screen-space pointer into tile coords.
// Game asks input.pickTile(event) → { tx, ty } or null.

import * as THREE from 'three';
import { worldToTile, inBounds } from './grid.js';

export class Input {
  constructor(scene, canvas) {
    this.scene = scene;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
  }

  pickTile(ev) {
    // Support both mouse + touch
    const rect = this.canvas.getBoundingClientRect();
    const x = (ev.clientX ?? ev.touches?.[0]?.clientX);
    const y = (ev.clientY ?? ev.touches?.[0]?.clientY);
    if (x == null || y == null) return null;
    this.ndc.set(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.scene.camera);
    // Intersect with tile meshes (already z-stacked at y≈0)
    const hits = this.raycaster.intersectObjects(this.scene.tileMeshes, false);
    if (hits.length === 0) return null;
    const t = hits[0].object.userData;
    if (!t || t.kind !== 'tile') return null;
    if (!inBounds(t.tx, t.ty)) return null;
    return { tx: t.tx, ty: t.ty, tile: hits[0].object };
  }
}
