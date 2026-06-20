# Nausilus Architecture

Nausilus is intentionally small: a Tauri macOS shell around a TypeScript canvas renderer.

## Stack

- Tauri 2 for the desktop app shell
- Vite for local development and frontend builds
- TypeScript for renderer code
- HTML canvas 2D for the jellyfish animation
- Rust only for the default Tauri host crate

## Runtime Flow

1. `index.html` creates the canvas element.
2. `src/main.ts` configures canvas interaction, resize behavior, color state, wireframe state, and the animation loop.
3. `src/denki_upstream_static/render.ts` renders each frame into the canvas.
4. Tauri packages the built frontend into a macOS app bundle.

## Renderer

The renderer adapts ideas and geometry from Denki Kurage by likeablob. Attribution and the upstream MIT notice are preserved in `CREDITS.md`.

The current renderer has three major responsibilities:

- particle background movement
- jellyfish geometry and bell/tentacle projection
- color and wireframe drawing modes

## Interaction State

The canvas stores inspectable state through `data-color-mode` and `data-wireframe`.

User controls:

- center click cycles color
- top-right click toggles wireframe rendering
- left/right hold applies a gentle heading turn

## Build And Distribution

The source is the primary public artifact. Local builds use:

```bash
npm ci
npm run build
npx tauri build --bundles app
```

The tester release is unsigned and not notarized. Checksums prove file integrity, but they do not provide Apple Developer ID trust.

## Non-Goals For Now

- system tray integration
- auto-update infrastructure
- broad public installer distribution
- signing or notarization automation without maintainer approval
- additional creature modes
