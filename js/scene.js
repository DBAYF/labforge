// Three.js scene setup. Mars terrain (orange), grid lines, path, greenhouse dome,
// spawn tunnel, sun light. Ortho-ish perspective camera looking down at angle.

import * as THREE from 'three';
import { GRID_W, GRID_H, TILE, PATH_TILES, PATH_WORLD, isPathTile, tileToWorld } from './grid.js';

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.three = new THREE.Scene();
    this.three.background = new THREE.Color(0x0a0408);
    this.three.fog = new THREE.Fog(0x1a0a08, 60, 180);

    // Camera — ortho-ish perspective looking down the long axis.
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 400);
    this._fitCamera();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = false; // keep cheap on free hosting

    // Lights
    const ambient = new THREE.AmbientLight(0x445566, 0.7);
    this.three.add(ambient);
    const sun = new THREE.DirectionalLight(0xffd6a8, 1.1);
    sun.position.set(40, 60, -20);
    this.three.add(sun);

    // Distant sun disc
    {
      const sunGeom = new THREE.SphereGeometry(2.4, 24, 24);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa66 });
      const sunMesh = new THREE.Mesh(sunGeom, sunMat);
      sunMesh.position.set(40, 28, -60);
      this.three.add(sunMesh);
    }

    // Mars ground (with subtle hue variation)
    {
      const w = GRID_W * TILE;
      const h = GRID_H * TILE;
      const geom = new THREE.PlaneGeometry(w, h, 1, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x6e2d1c,
        roughness: 0.95,
        metalness: 0.02,
      });
      const ground = new THREE.Mesh(geom, mat);
      ground.rotation.x = -Math.PI / 2;
      this.three.add(ground);
    }

    // Star field (cheap)
    {
      const stars = new THREE.BufferGeometry();
      const N = 220;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const r = 200 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.8 + 30;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      stars.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false });
      this.three.add(new THREE.Points(stars, starMat));
    }

    // Grid tiles
    this.tileMeshes = [];
    {
      const tileGeom = new THREE.PlaneGeometry(TILE * 0.94, TILE * 0.94);
      const buildMat = new THREE.MeshStandardMaterial({
        color: 0x0c1c2e, roughness: 0.7, metalness: 0.05,
        emissive: 0x002233, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.6,
      });
      const pathMat = new THREE.MeshStandardMaterial({
        color: 0xc06028, roughness: 0.85, metalness: 0.02,
        emissive: 0x4a1810, emissiveIntensity: 0.3,
      });
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const isPath = isPathTile(x, y);
          const m = new THREE.Mesh(tileGeom, isPath ? pathMat : buildMat.clone());
          m.position.copy(tileToWorld(x, y));
          m.position.y = 0.01;
          m.rotation.x = -Math.PI / 2;
          m.userData = { kind: 'tile', tx: x, ty: y, isPath };
          this.three.add(m);
          this.tileMeshes.push(m);
        }
      }
    }

    // Spawn arch (where enemies enter)
    {
      const arch = new THREE.Group();
      const tube = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.3, 8, 18, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0xff3366, emissiveIntensity: 0.6 }),
      );
      tube.rotation.x = -Math.PI / 2;
      tube.rotation.z = Math.PI / 2;
      arch.add(tube);
      arch.position.copy(PATH_WORLD[0]);
      arch.position.y = 0.5;
      this.three.add(arch);
      this.spawnArch = arch;
    }

    // Greenhouse dome at the end of path
    {
      const greenhouse = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.2, 0.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a2433, metalness: 0.2, roughness: 0.4 }),
      );
      base.position.y = 0.25;
      greenhouse.add(base);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(3.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: 0x4ade80, metalness: 0.1, roughness: 0.2,
          transparent: true, opacity: 0.34,
          emissive: 0x4ade80, emissiveIntensity: 0.3,
          side: THREE.DoubleSide,
        }),
      );
      dome.position.y = 0.5;
      greenhouse.add(dome);
      // Inner plant beds
      for (let i = 0; i < 4; i++) {
        const plant = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1.0, 6),
          new THREE.MeshStandardMaterial({ color: 0x3b8c4a, emissive: 0x1a4022, emissiveIntensity: 0.4 }),
        );
        const a = (i / 4) * Math.PI * 2;
        plant.position.set(Math.cos(a) * 1.4, 0.8, Math.sin(a) * 1.4);
        greenhouse.add(plant);
      }
      const target = PATH_WORLD[PATH_WORLD.length - 1];
      greenhouse.position.copy(target);
      greenhouse.position.y = 0.25;
      this.three.add(greenhouse);
      this.greenhouse = greenhouse;
    }

    // Path stripe — bright lit ribbon along the path tiles for clarity
    {
      const points = PATH_WORLD.map((p) => p.clone().setY(0.15));
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.0);
      const geom = new THREE.TubeGeometry(curve, 64, 0.18, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff9966, transparent: true, opacity: 0.55 });
      this.three.add(new THREE.Mesh(geom, mat));
    }

    // Resize handling
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize, { passive: true });
    this._resize();
  }

  _fitCamera() {
    // Position camera so the whole grid fits with a slight tilt.
    this.camera.position.set(0, 42, 28);
    this.camera.lookAt(0, 0, 0);
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.three, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._resize);
    this.renderer.dispose();
  }
}
