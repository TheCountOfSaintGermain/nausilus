// math3d.ts — Denki Kurage 3D math
// Transliterated from: third_party/denki-kurage/src/math_3d.cpp
import type { Point3D, Point2D } from './types.js';
import { FOV, CAMERA_DIST, SCREEN_WIDTH, SCREEN_HEIGHT } from './config.js';

// Rotation parameters — set by updateRotationParams
let sx = 0, cx = 1, sy = 0, cy = 1, sz = 0, cz = 1;

export function updateRotationParams(ax: number, ay: number, az: number): void {
  sx = Math.sin(ax);
  cx = Math.cos(ax);
  sy = Math.sin(ay);
  cy = Math.cos(ay);
  sz = Math.sin(az);
  cz = Math.cos(az);
}

// YXZ Euler rotation — matches upstream rotateFast(Point3D p)
export function rotateFast(p: Point3D): Point3D {
  // Rotate around X
  let tmp_y = p.y * cx - p.z * sx;
  let tmp_z = p.y * sx + p.z * cx;
  let y = tmp_y;
  let z = tmp_z;

  // Rotate around Y
  let tmp_x = p.x * cy + z * sy;
  tmp_z = -p.x * sy + z * cy;
  let x = tmp_x;
  z = tmp_z;

  // Rotate around Z
  tmp_x = x * cz - y * sz;
  tmp_y = x * sz + y * cz;
  x = tmp_x;
  y = tmp_y;

  return { x, y, z };
}

// Perspective projection — matches upstream project(Point3D, global_x, global_y, global_z)
export function project(
  p: Point3D,
  global_x: number,
  global_y: number,
  global_z: number,
): Point2D {
  const world_z = CAMERA_DIST + p.z + global_z;
  if (world_z < 20.0) {
    return { x: 0, y: 0, z: 0, valid: false };
  }
  const scale = FOV / world_z;
  const x = SCREEN_WIDTH / 2 + (p.x + global_x) * scale;
  const y = SCREEN_HEIGHT / 2 + (p.y + global_y) * scale;
  const valid = x >= -50 && x < SCREEN_WIDTH + 50 && y >= -50 && y < SCREEN_HEIGHT + 50;
  return { x, y, z: world_z, valid };
}
