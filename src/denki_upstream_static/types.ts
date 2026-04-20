// types.ts — Denki Kurage types
// Transliterated from: third_party/denki-kurage/src/types.h

export enum ColorMode {
  CYAN = 0,
  PURPLE = 1,
  GOLD = 2,
  ORANGE = 3,
  RED = 4,
  GREEN = 5,
  WHITE = 6,
  NUM_MODES = 7,
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
  z: number;  // depth for Z-sorting and shading
  valid: boolean;
}

export interface Triangle {
  v: [number, number, number];  // vertex indices
  avgZ: number;
  visible: boolean;
}

export interface Particle {
  x: number;
  y: number;
  speed: number;
  brightness: number;
}
