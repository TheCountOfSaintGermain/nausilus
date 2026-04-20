// render.ts — Denki Kurage static upstream-faithful frame
// Renders one frozen frame using exact upstream geometry and math
import { SCREEN_WIDTH, SCREEN_HEIGHT, NUM_BELL_VERTICES, NUM_TENTACLES, TENTACLE_SEGMENTS } from './config.js';
import { updateRotationParams } from './math3d.js';
import { drawJellyfish, buildJellyfishGeometry } from './jellyfish.js';
import { ColorMode, type Point2D, type Particle } from './types.js';

// ─── Upstream particle constants ─────────────────────────────────
const NUM_PARTICLES = 50;

// ─── Frozen state (exact upstream-derived values, phase=0) ───
const FROZEN_COLOR_MODE: ColorMode = ColorMode.PURPLE;
const FROZEN_WIREFRAME = true;

// ─── Persistent autonomous yaw state ──────────────────────────
// Mimics upstream main.cpp autonomous yaw pattern:
//   - autonomousYaw accumulates rotationSpeed each frame (like upstream angle_y)
//   - target_rotation_speed refreshed infrequently (every ~45s simulated)
//   - current rotationSpeed eases toward target at 0.005/frame
// headingAccum is user-derived heading bias passed in from the caller
let autonomousYaw: number = 1.0;  // shifted from 0.4 to move the favored linger angle away from the over-favored baseline pose
let rotationSpeed: number = 0;
let targetRotationSpeed: number = 0;
let yawChangeFrameCounter: number = 0;

// ─── Upstream particle state ──────────────────────────────────
// Initialized once; updated each frame in renderUpstreamAnimatedFrame
const particles: Particle[] = Array.from({ length: NUM_PARTICLES }, () => ({
  x: 0, y: 0, speed: 0, brightness: 0,
}));

function initParticles(): void {
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles[i].x = Math.random() * SCREEN_WIDTH;
    particles[i].y = Math.random() * SCREEN_HEIGHT;
    particles[i].speed = (5 + Math.random() * 10) / 10.0;  // random(5, 15) / 10.0f
    particles[i].brightness = 40 + Math.random() * 140;    // random(40, 180)
  }
}

// Initialize on first use
let particlesInitialized = false;
let lastT = -1;  // previous frame timestamp for deltaPhase computation
let lastDebugT = -1;  // previous frame timestamp for FPS computation

// ─── Debug overlay ─────────────────────────────────────────────
function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  t: number,
  wireframe: boolean,
  interactionBias: number,
  headingAccum: number,
): void {
  // FPS — compute from frame delta, clamp resume jumps
  let fps = 60;
  if (lastDebugT > 0) {
    let dt = (t - lastDebugT) * 1000;  // ms
    if (dt > 500) dt = 500;  // clamp tab-switch resume
    if (dt > 0) fps = Math.round(1000 / dt);
  }
  lastDebugT = t;

  const W = SCREEN_WIDTH;
  const H = SCREEN_HEIGHT;
  const ZONE = 45;         // top/bottom strip height (matches upstream)
  const CORNER = 40;       // right-edge corner strip width (matches upstream)
  const MID_LEFT = 80;     // middle vertical divider left (matches upstream)
  const MID_RIGHT = 160;   // middle vertical divider right (matches upstream)
  const STEP = 4;          // dotted-line step (matches upstream)

  ctx.save();
  ctx.strokeStyle = '#FFE000';  // TFT_YELLOW equivalent
  ctx.fillStyle = '#FFE000';
  ctx.lineWidth = 0.5;

  // Horizontal dividers — top and bottom bands (dotted)
  for (let x = 0; x < W; x += STEP) {
    ctx.fillRect(x, ZONE, 1, 1);
    ctx.fillRect(x, H - ZONE, 1, 1);
  }

  // Vertical dividers — middle section (dotted)
  for (let y = ZONE; y < H - ZONE; y += STEP) {
    ctx.fillRect(MID_LEFT, y, 1, 1);
    ctx.fillRect(MID_RIGHT, y, 1, 1);
  }

  // Corner square vertical dividers — top-right strip
  for (let y = 0; y < ZONE; y += STEP) {
    ctx.fillRect(W - CORNER, y, 1, 1);
  }

  // Corner square vertical dividers — bottom-right strip
  for (let y = H - ZONE; y < H; y += STEP) {
    ctx.fillRect(W - CORNER, y, 1, 1);
  }

  // Region labels — centered in each zone
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '6px monospace';
  ctx.fillText('T', 120, 22);    // top-center
  ctx.fillText('TR', 220, 22);   // top-right
  ctx.fillText('ML', 40, 160);   // middle-left
  ctx.fillText('MC', 120, 160);  // middle-center
  ctx.fillText('MR', 200, 160);  // middle-right
  ctx.fillText('B', 120, 297);   // bottom-center
  ctx.fillText('BR', 220, 297);  // bottom-right

  // Stats block — bottom-left
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '7px monospace';
  const yawDeg = ((headingAccum * 180 / Math.PI) % 360).toFixed(1);
  const lines = [
    `FPS: ${fps}`,
    `MODE: ${wireframe ? 'Wire' : 'Solid'}`,
    `YAW: ${yawDeg}`,
    `Y_OFF: ${interactionBias.toFixed(0)}`,
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, 4, H - 60 + i * 9);
  });

  ctx.restore();
}

// ─── Animated variant (same geometry, time-driven params) ───
export function renderUpstreamAnimatedFrame(
  canvas: HTMLCanvasElement,
  t: number,
  colorMode: ColorMode = FROZEN_COLOR_MODE,
  wireframe: boolean = FROZEN_WIREFRAME,
  showDebug: boolean = false,
  interactionBias: number = 0,
  headingAccum: number = 0,
): void {
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = 'rgb(0,0,0)';
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  // Tentacle wave phase — declared early so particle update can read it
  const phase = t * 1.3;

  // ─── Upstream particle background ────────────────────────────
  // Neutral flow only (no vertical input plumbing in this pass).
  // Particles draw behind jellyfish via render order.
  if (!particlesInitialized) {
    initParticles();
    particlesInitialized = true;
    lastT = t;
  }

  // Elapsed-phase since last frame, normalized to upstream-loop-equivalent units.
  // Upstream phase step per loop: 0.08f.  Browser phase rate: 1.3 rad/s.
  // Loop-equivalent ratio: 1.3 / 0.08 = 16.25  →  1s of browser time ≈ 16.25 upstream loops.
  const RAW_PHASE_PER_SECOND = 1.3;
  const UPSTREAM_PHASE_PER_LOOP = 0.08;
  const LOOP_EQUIV_RATIO = RAW_PHASE_PER_SECOND / UPSTREAM_PHASE_PER_LOOP; // 16.25

  // Clamp unusually large resume jumps so tab-switch does not teleport particles.
  let deltaPhase = (t - lastT) * LOOP_EQUIV_RATIO;
  if (deltaPhase > UPSTREAM_PHASE_PER_LOOP * 10) {
    deltaPhase = UPSTREAM_PHASE_PER_LOOP * 10;
  }
  lastT = t;

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const p = particles[i];
    // Scale both terms by deltaPhase so particle advances in loop-equivalent units.
    // Upstream: particle.y -= p_speed  (one step per loop at 0.08 phase)
    // Upstream: particle.x += sinf(phase + i) * 0.3f  (accumulated per loop)
    p.y -= p.speed * deltaPhase;
    p.x += Math.sin(phase + i) * 0.3 * deltaPhase;

    // Wrap to opposite edge and randomize x (upstream main.cpp lines 125-131)
    if (p.y < 0) {
      p.y = SCREEN_HEIGHT;
      p.x = Math.random() * SCREEN_WIDTH;
    } else if (p.y > SCREEN_HEIGHT) {
      p.y = 0;
      p.x = Math.random() * SCREEN_WIDTH;
    }

    // Cyan-toned single-pixel particle (upstream: tft.color565(0, brightness, brightness))
    // Browser-only extension: particle tint follows active colorMode.
    // Each mode gets a subdued hue-derived from its primary channel.
    // Per-particle brightness variation is preserved.
    const b = Math.round(p.brightness);
    const scale = b / 255;
    let pr = 0, pg = 0, pb = 0;
    switch (colorMode) {
      case ColorMode.PURPLE: pr = Math.round(144 * scale * 0.5); pg = Math.round(28 * scale * 0.5); pb = Math.round(230 * scale * 0.5); break;
      case ColorMode.GOLD:   pr = Math.round(230 * scale * 0.6); pg = Math.round(194 * scale * 0.6); pb = 0; break;
      case ColorMode.ORANGE: pr = Math.round(230 * scale * 0.6); pg = Math.round(120 * scale * 0.6); pb = 0; break;
      case ColorMode.RED:    pr = Math.round(230 * scale * 0.5); pg = Math.round(40 * scale * 0.5); pb = Math.round(40 * scale * 0.5); break;
      case ColorMode.GREEN:  pr = Math.round(40 * scale * 0.5);  pg = Math.round(220 * scale * 0.5); pb = Math.round(80 * scale * 0.5); break;
      case ColorMode.WHITE:  pr = Math.round(230 * scale * 0.5); pg = Math.round(230 * scale * 0.5); pb = Math.round(230 * scale * 0.5); break;
      case ColorMode.CYAN:
      default:               pr = 0; pg = Math.round(230 * scale * 0.5); pb = Math.round(230 * scale * 0.5); break;
    }
    ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }

  // Autonomous yaw — upstream-shaped: slow easing toward target, target refresh infrequent
  // Upstream: target_rotation_speed refreshed every 45000ms, eased at 0.005/frame
  // Simulated: target refreshed every ~2700 frames (~45s at 60fps), eased same way
  yawChangeFrameCounter++;
  if (yawChangeFrameCounter >= 2700) {
    // Anti-dwell yaw target sampling: sign/magnitude split prevents near-zero targets.
    // Old uniform draw: (Math.random() * 0.012) - 0.006 could produce values arbitrarily close to zero,
    // causing long low-turn dwell periods between retargets.
    // New: sign is 50/50 random, magnitude is [0.002, 0.006]. Minimum target magnitude = 0.002.
    targetRotationSpeed = (Math.random() < 0.5 ? -1 : 1) * (0.002 + Math.random() * 0.004);
    yawChangeFrameCounter = 0;
  }
  rotationSpeed += (targetRotationSpeed - rotationSpeed) * 0.005;
  autonomousYaw += rotationSpeed;

  // Baseline pitch tilt — matches upstream angle_x = -0.5f (fixed, not accumulated).
  // This gives the bell its characteristic tilted/3/4 presentation baseline so
  // autonomous yaw has a tilted surface to work against rather than a flat face-on view.

  // Opening-pose correction: first 36 frames bias the bell more front-facing
  // (less cupola interior visible), then smoothly ease to the baseline tilt.
  const OPENING_POSE_FRAMES = 36;
  const openingAlpha = Math.max(0, 1 - t / OPENING_POSE_FRAMES);
  const openingEase = openingAlpha * openingAlpha * (3 - 2 * openingAlpha);
  const openingPitchBias = 0.42 * openingEase;
  const ax = -0.5 + openingPitchBias;
  const ay = autonomousYaw + headingAccum;
  const az = 0;

  // Autonomous x/z drift — upstream transliteration
  // globalXOffset = sin(phase * 0.15) * 35.0 + cos(phase * 0.25) * 15.0
  // globalZOffset = sin(phase * 0.1) * 45.0
  const globalXOffset = Math.sin(phase * 0.15) * 35.0 + Math.cos(phase * 0.25) * 15.0;
  const globalZOffset = Math.sin(phase * 0.1) * 45.0;

  // Jellyfish stays centered with gentle bob (vertical oscillation)
  // interactionBias: negative = up, positive = down — additive vertical shift while held
  const bob = Math.sin(t * 0.45) * 8.0;
  const gx = globalXOffset;
  const gy = -95 + bob + interactionBias;
  const gz = globalZOffset;

  // Bell expansion/contraction pulse — amplitude reduced from 0.25 (too exaggerated)
  // toward 0.04 (too subtle); timing basis t * 0.7 unchanged
  const expansion = 1.0 + Math.sin(t * 0.7) * 0.12;

  updateRotationParams(ax, ay, az);

  const bell2d: Point2D[] = Array.from({ length: NUM_BELL_VERTICES }, () => ({
    x: 0, y: 0, z: 0, valid: false,
  }));
  const tentacles2d: Point2D[][] = Array.from({ length: NUM_TENTACLES }, () =>
    Array.from({ length: TENTACLE_SEGMENTS }, () => ({
      x: 0, y: 0, z: 0, valid: false,
    })),
  );

  buildJellyfishGeometry(bell2d, tentacles2d, phase, gx, gy, gz, expansion);
  drawJellyfish(ctx, bell2d, tentacles2d, colorMode, wireframe);

  if (showDebug) {
    drawDebugOverlay(ctx, t, wireframe, interactionBias, headingAccum);
  }
}
