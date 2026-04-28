// Grid + path. Square 16x10 grid; predetermined L-shaped path from spawn → greenhouse.
// Towers can place on any non-path tile.

import * as THREE from 'three';

export const GRID_W = 16;
export const GRID_H = 10;
export const TILE = 4; // world units per tile

// Path waypoints in tile coordinates. L-shape: enter left-mid, kink down, run right.
export const PATH_TILES = [
  { x: 0,  y: 5 },
  { x: 4,  y: 5 },
  { x: 4,  y: 7 },
  { x: 9,  y: 7 },
  { x: 9,  y: 4 },
  { x: 13, y: 4 },
  { x: 13, y: 6 },
  { x: 15, y: 6 }, // greenhouse
];

// Build a Set of "path tile" string keys for fast occupancy tests.
function pathSegments() {
  const s = new Set();
  for (let i = 0; i < PATH_TILES.length - 1; i++) {
    const a = PATH_TILES[i];
    const b = PATH_TILES[i + 1];
    if (a.x === b.x) {
      const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
      for (let y = lo; y <= hi; y++) s.add(`${a.x},${y}`);
    } else {
      const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
      for (let x = lo; x <= hi; x++) s.add(`${x},${a.y}`);
    }
  }
  return s;
}
export const PATH_SET = pathSegments();

export function tileToWorld(tx, ty) {
  return new THREE.Vector3(
    (tx - GRID_W / 2 + 0.5) * TILE,
    0,
    (ty - GRID_H / 2 + 0.5) * TILE,
  );
}
export function worldToTile(p) {
  return {
    x: Math.floor(p.x / TILE + GRID_W / 2),
    y: Math.floor(p.z / TILE + GRID_H / 2),
  };
}
export function isPathTile(tx, ty) { return PATH_SET.has(`${tx},${ty}`); }
export function inBounds(tx, ty)   { return tx >= 0 && tx < GRID_W && ty >= 0 && ty < GRID_H; }

// World-space path waypoints — enemy follows in order.
export const PATH_WORLD = PATH_TILES.map((t) => tileToWorld(t.x, t.y));

// Path total length, useful for progress bars.
export const PATH_LENGTH = (() => {
  let len = 0;
  for (let i = 0; i < PATH_WORLD.length - 1; i++) {
    len += PATH_WORLD[i].distanceTo(PATH_WORLD[i + 1]);
  }
  return len;
})();
