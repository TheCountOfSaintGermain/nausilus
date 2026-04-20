import './styles/main.css';
import { renderUpstreamAnimatedFrame } from './denki_upstream_static/render.js';
import { ColorMode } from './denki_upstream_static/types.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Prevent browser context menu on right-click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const HEADING_TURN_RATE = 0.004; // radians per frame while held

// Heading interaction state — persists after release
let headingTurnDelta = 0.0;
let accumulatedHeading = 0.0;

// Color mode state — cycles: CYAN → PURPLE → GOLD → ORANGE → RED → GREEN → WHITE → CYAN
let colorMode: ColorMode = ColorMode.CYAN;

// Wireframe toggle state
let wireframe: boolean = true;

// Debug overlay state
let showDebug: boolean = false;

let activePointerId: number | null = null;
let currentAction: 'turn-left' | 'turn-right' | 'cycle-color' | 'toggle-wireframe' | 'toggle-debug' | null = null;

function getCanvasCoords(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function getInteractionAction(e: PointerEvent): typeof currentAction {
  const { x, y } = getCanvasCoords(e);
  const MID_BAND_TOP = 80;
  const MID_BAND_BOTTOM = 240;
  const TOP_RIGHT_SIZE = 60;

  // Center zone — discrete tap to cycle color mode
  const CX = canvas.width / 2;
  const CY = canvas.height / 2;
  const CENTER_RADIUS = 70;
  if (Math.hypot(x - CX, y - CY) < CENTER_RADIUS) {
    return 'cycle-color';
  }

  // Top-right zone — toggle wireframe mode
  if (x > canvas.width - TOP_RIGHT_SIZE && y < TOP_RIGHT_SIZE) {
    return 'toggle-wireframe';
  }

  // Bottom-right zone — toggle debug overlay
  if (x > canvas.width - TOP_RIGHT_SIZE && y > canvas.height - TOP_RIGHT_SIZE) {
    return 'toggle-debug';
  }

  if (y >= MID_BAND_TOP && y <= MID_BAND_BOTTOM) {
    return x < canvas.width / 2 ? 'turn-left' : 'turn-right';
  }

  return null;
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  // Only respond to primary mouse button or touch
  if (e.button !== 0 && e.pointerType !== 'touch') return;

  const action = getInteractionAction(e);
  if (action === null) return;

  activePointerId = e.pointerId;
  currentAction = action;
  canvas.setPointerCapture(e.pointerId);

  if (action === 'turn-right') {
    headingTurnDelta = HEADING_TURN_RATE;
  } else if (action === 'turn-left') {
    headingTurnDelta = -HEADING_TURN_RATE;
  } else if (action === 'cycle-color') {
    colorMode = (colorMode + 1) % ColorMode.NUM_MODES;
  } else if (action === 'toggle-wireframe') {
    wireframe = !wireframe;
  } else if (action === 'toggle-debug') {
    showDebug = !showDebug;
  }
});

canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (activePointerId !== e.pointerId) return;

  const action = getInteractionAction(e);
  currentAction = action;

  if (action === 'turn-right') {
    headingTurnDelta = HEADING_TURN_RATE;
  } else if (action === 'turn-left') {
    headingTurnDelta = -HEADING_TURN_RATE;
  } else {
    headingTurnDelta = 0;
    currentAction = null;
  }
});

canvas.addEventListener('pointerup', (e: PointerEvent) => {
  if (activePointerId === e.pointerId) {
    activePointerId = null;
    currentAction = null;
    headingTurnDelta = 0;
  }
});

canvas.addEventListener('pointercancel', (e: PointerEvent) => {
  if (activePointerId === e.pointerId) {
    activePointerId = null;
    currentAction = null;
    headingTurnDelta = 0;
  }
});

let startTime: number | null = null;

function frame(ts: number): void {
  if (startTime === null) startTime = ts;
  const t = (ts - startTime) / 1000;

  accumulatedHeading += headingTurnDelta;

  renderUpstreamAnimatedFrame(
    canvas,
    t,
    colorMode,
    wireframe,
    showDebug,
    0,
    accumulatedHeading,
  );

  requestAnimationFrame(frame);
}

function resizeCanvas(): void {
  const availW = window.innerWidth;
  const availH = window.innerHeight;

  // Largest exact 3:4 rect that fits in the available area
  // 3:4 means height = (4/3) * width
  // Try fitting by width first, then by height
  let w: number, h: number;
  if (availW * 4 <= availH * 3) {
    // Fit by width
    w = availW;
    h = Math.floor((4 / 3) * w);
  } else {
    // Fit by height
    h = availH;
    w = Math.floor((3 / 4) * h);
  }

  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

requestAnimationFrame(frame);
