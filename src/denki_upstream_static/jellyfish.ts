// jellyfish.ts — Denki Kurage jellyfish render
// Transliterated from: third_party/denki-kurage/src/jellyfish.cpp
// Geometry build from: third_party/denki-kurage/src/main.cpp (loop body)
import type { Point2D, Point3D, Triangle } from './types.js';
import { ColorMode } from './types.js';
import {
  BELL_RINGS,
  BELL_POINTS_PER_RING,
  NUM_TENTACLES,
  TENTACLE_SEGMENTS,
} from './config.js';
import { rotateFast, project } from './math3d.js';

// ─── Bell triangle indices (84 triangles: 12 cap + 72 ring) ───
const bellTriangles: Triangle[] = [];
let trianglesInitialized = false;

function initTriangles(): void {
  if (trianglesInitialized) return;
  let tri_idx = 0;

  // Cap: peak (0) to ring 0 (indices 1–12)
  for (let i = 0; i < BELL_POINTS_PER_RING; i++) {
    bellTriangles.push({
      v: [0, 1 + i, 1 + (i + 1) % BELL_POINTS_PER_RING],
      avgZ: 0,
      visible: false,
    });
    tri_idx++;
  }

  // Rings: ring r to ring r+1
  for (let r = 0; r < BELL_RINGS - 1; r++) {
    for (let i = 0; i < BELL_POINTS_PER_RING; i++) {
      const current_ring_base = 1 + r * BELL_POINTS_PER_RING;
      const next_ring_base = 1 + (r + 1) * BELL_POINTS_PER_RING;
      const i1 = i;
      const i2 = (i + 1) % BELL_POINTS_PER_RING;

      // Triangle 1
      bellTriangles.push({
        v: [current_ring_base + i1, next_ring_base + i1, current_ring_base + i2],
        avgZ: 0,
        visible: false,
      });
      // Triangle 2
      bellTriangles.push({
        v: [current_ring_base + i2, next_ring_base + i1, next_ring_base + i2],
        avgZ: 0,
        visible: false,
      });
    }
  }

  trianglesInitialized = true;
}

// ─── Color conversion (RGB565 → canvas rgba) ───
function getJellyfishColor(mode: ColorMode, brightness = 1.0): string {
  let r565: number;
  switch (mode) {
    case ColorMode.PURPLE: r565 = ((144 & 0xf8) << 8) | ((28 & 0xfc) << 3) | (230 >> 3); break;
    case ColorMode.GOLD:    r565 = ((230 & 0xf8) << 8) | ((194 & 0xfc) << 3) | (0 >> 3); break;
    case ColorMode.ORANGE:  r565 = ((230 & 0xf8) << 8) | ((120 & 0xfc) << 3) | (0 >> 3); break;
    case ColorMode.RED:     r565 = ((230 & 0xf8) << 8) | ((40 & 0xfc) << 3) | (40 >> 3); break;
    case ColorMode.GREEN:   r565 = ((40 & 0xf8) << 8) | ((220 & 0xfc) << 3) | (80 >> 3); break;
    case ColorMode.WHITE:  r565 = ((230 & 0xf8) << 8) | ((230 & 0xfc) << 3) | (230 >> 3); break;
    case ColorMode.CYAN:
    default:               r565 = ((0 & 0xf8) << 8) | ((230 & 0xfc) << 3) | (230 >> 3); break;
  }
  // Return RGB triplet only — alpha handled separately in canvas ctx
  const r = Math.round(((r565 >> 11) & 0x1f) / 0x1f * 255 * brightness);
  const g = Math.round(((r565 >> 5) & 0x3f) / 0x3f * 255 * brightness);
  const b = Math.round((r565 & 0x1f) / 0x1f * 255 * brightness);
  return `rgb(${r},${g},${b})`;
}

// ─── Bell geometry build (from main.cpp loop body) ───
function buildBell(
  bell2d: Point2D[],
  global_x: number,
  global_y: number,
  global_z: number,
  expansion: number,
): void {
  // Apex
  const apex: Point3D = { x: 0, y: -35.0, z: 0 };
  bell2d[0] = project(rotateFast(apex), global_x, global_y, global_z);

  // Rings
  for (let r = 0; r < BELL_RINGS; r++) {
    const normalized_r = (r + 1) / BELL_RINGS;
    const ring_y = -20.0 + r * 18.0;
    const ring_radius = 120.0 * Math.sin(normalized_r * Math.PI * 0.5) * expansion;
    for (let i = 0; i < BELL_POINTS_PER_RING; i++) {
      const theta = (i * 2.0 * Math.PI) / BELL_POINTS_PER_RING;
      const p3: Point3D = {
        x: ring_radius * Math.cos(theta),
        y: ring_y,
        z: ring_radius * Math.sin(theta),
      };
      bell2d[1 + r * BELL_POINTS_PER_RING + i] = project(
        rotateFast(p3),
        global_x, global_y, global_z,
      );
    }
  }
}

// ─── Tentacle geometry build (from main.cpp loop body) ───
function buildTentacles(
  tentacles2d: Point2D[][],
  global_x: number,
  global_y: number,
  global_z: number,
  phase: number,
  expansion: number,
): void {
  for (let t = 0; t < NUM_TENTACLES; t++) {
    const theta = (t * 2.0 * Math.PI) / NUM_TENTACLES;
    const base_x = 35.0 * Math.cos(theta) * expansion;
    const base_z = 35.0 * Math.sin(theta) * expansion;
    const base_y = 30.0;
    for (let s = 0; s < TENTACLE_SEGMENTS; s++) {
      const wave = Math.sin(phase - s * 0.7) * 20.0;
      const p3: Point3D = {
        x: base_x + wave * Math.cos(theta),
        y: base_y + s * 35.0,
        z: base_z + wave * Math.sin(theta),
      };
      tentacles2d[t][s] = project(rotateFast(p3), global_x, global_y, global_z);
    }
  }
}

// ─── Draw jellyfish (solid + wireframe paths from upstream) ───
export function drawJellyfish(
  ctx: CanvasRenderingContext2D,
  bell: Point2D[],
  tentacles: Point2D[][],
  mode: ColorMode,
  wireframe: boolean,
): void {
  const base_color = getJellyfishColor(mode);

  if (!wireframe) {
    initTriangles();

    // Backface culling + avg Z calculation
    const visibleIndices: number[] = [];

    for (let i = 0; i < bellTriangles.length; i++) {
      const v0 = bell[bellTriangles[i].v[0]];
      const v1 = bell[bellTriangles[i].v[1]];
      const v2 = bell[bellTriangles[i].v[2]];

      if (!v0.valid || !v1.valid || !v2.valid) {
        bellTriangles[i].visible = false;
        continue;
      }

      // 2D cross product — clockwise winding = front face (cross < 0)
      const cross = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);
      if (cross < 0) {
        bellTriangles[i].visible = true;
        bellTriangles[i].avgZ = (v0.z + v1.z + v2.z) / 3.0;
        visibleIndices.push(i);
      } else {
        bellTriangles[i].visible = false;
      }
    }

    // Z-sort descending (back to front)
    visibleIndices.sort((a, b) => bellTriangles[b].avgZ - bellTriangles[a].avgZ);

    // Render solid triangles with depth shading
    for (const idx of visibleIndices) {
      const tri = bellTriangles[idx];
      const v0 = bell[tri.v[0]];
      const v1 = bell[tri.v[1]];
      const v2 = bell[tri.v[2]];

      // Depth shading — matches upstream: 1.0 - ((avgZ - 350) / 300), clamped [0.2, 1.0]
      let depth_factor = 1.0 - (tri.avgZ - 350.0) / 300.0;
      if (depth_factor < 0.2) depth_factor = 0.2;
      if (depth_factor > 1.0) depth_factor = 1.0;

      ctx.fillStyle = getJellyfishColor(mode, depth_factor);
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Wireframe — matches upstream drawJellyfish wireframe path
    ctx.strokeStyle = base_color;
    ctx.lineWidth = 0.5;

    for (let i = 0; i < BELL_POINTS_PER_RING; i++) {
      const p0 = bell[0];
      const p1 = bell[1 + i];
      if (p0.valid && p1.valid) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      for (let r = 0; r < BELL_RINGS; r++) {
        const idx = 1 + r * BELL_POINTS_PER_RING + i;
        const n_idx = 1 + r * BELL_POINTS_PER_RING + (i + 1) % BELL_POINTS_PER_RING;
        if (bell[idx].valid && bell[n_idx].valid) {
          ctx.beginPath();
          ctx.moveTo(bell[idx].x, bell[idx].y);
          ctx.lineTo(bell[n_idx].x, bell[n_idx].y);
          ctx.stroke();
        }
        if (r < BELL_RINGS - 1) {
          const nr_idx = 1 + (r + 1) * BELL_POINTS_PER_RING + i;
          if (bell[idx].valid && bell[nr_idx].valid) {
            ctx.beginPath();
            ctx.moveTo(bell[idx].x, bell[idx].y);
            ctx.lineTo(bell[nr_idx].x, bell[nr_idx].y);
            ctx.stroke();
          }
        }
      }
    }
  }

  // Tentacles — always lines (matches upstream)
  ctx.strokeStyle = base_color;
  ctx.lineWidth = 0.9;
  for (let j = 0; j < NUM_TENTACLES; j++) {
    const bi = 1 + (BELL_RINGS - 1) * BELL_POINTS_PER_RING +
               j * Math.floor(BELL_POINTS_PER_RING / NUM_TENTACLES);
    let pPrev = bell[bi];
    for (let s = 0; s < TENTACLE_SEGMENTS; s++) {
      const pCurr = tentacles[j][s];
      if (pPrev.valid && pCurr.valid) {
        ctx.beginPath();
        ctx.moveTo(pPrev.x, pPrev.y);
        ctx.lineTo(pCurr.x, pCurr.y);
        ctx.stroke();
      }
      pPrev = pCurr;
    }
  }
}

// ─── Exported geometry builder ───
export function buildJellyfishGeometry(
  bell: Point2D[],
  tentacles: Point2D[][],
  phase: number,
  global_x: number,
  global_y: number,
  global_z: number,
  expansion: number,
): void {
  buildBell(bell, global_x, global_y, global_z, expansion);
  buildTentacles(tentacles, global_x, global_y, global_z, phase, expansion);
}
