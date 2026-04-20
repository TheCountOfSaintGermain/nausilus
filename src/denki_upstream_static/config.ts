// config.ts — Denki Kurage geometry constants
// Transliterated from: third_party/denki-kurage/src/config.h

export const SCREEN_WIDTH = 240;
export const SCREEN_HEIGHT = 320;

// Geometry configuration
export const BELL_RINGS = 4;
export const BELL_POINTS_PER_RING = 12;
export const NUM_TENTACLES = 12;
export const TENTACLE_SEGMENTS = 8;
export const NUM_BELL_VERTICES = BELL_RINGS * BELL_POINTS_PER_RING + 1; // 49

// Math constants (from math_3d.cpp)
export const FOV = 160.0;
export const CAMERA_DIST = 500.0;
