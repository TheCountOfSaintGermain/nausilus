import type { Renderer } from './Renderer.js';

interface Star {
  worldX: number;  // fixed world position
  worldY: number;
  r: number;        // radius
  opacity: number;
  drift: number;    // micro-turbulence vertical drift per frame
  layer: 'far' | 'mid' | 'near';
}

/**
 * Starfield — sparse starfield with 3-layer parallax (T-06G)
 *
 * Stars have fixed world positions. They are rendered with a parallax
 * offset derived from camera drift:
 *   screen_x = star.worldX - cameraDriftX * parallaxFactor
 *   screen_y = star.worldY - cameraDriftY * parallaxFactor
 *
 * Parallax factors:
 *   FAR  (deep):  0.30 — slow, subtle parallax
 *   MID  (mid):    0.60 — medium parallax
 *   NEAR (close):  0.90 — fast parallax, nearly 1:1 with camera
 *
 * Plus micro-turbulence (small vertical oscillation) that also has
 * a slight directional bias from heading.
 *
 * Total count: 50 stars (same as T-06F)
 */
export class Starfield {
  private stars: Star[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number, _count: number = 50) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Layer distribution: 25 far, 15 mid, 10 near = 50 total
    const layerConfig: Array<{ layer: Star['layer']; count: number; r: number; opacityMin: number; opacityMax: number; driftMax: number }> = [
      { layer: 'far',  count: 25, r: 0.5, opacityMin: 0.15, opacityMax: 0.40, driftMax: 0.03 },
      { layer: 'mid',  count: 15, r: 0.7, opacityMin: 0.25, opacityMax: 0.55, driftMax: 0.05 },
      { layer: 'near', count: 10, r: 1.0, opacityMin: 0.40, opacityMax: 0.70, driftMax: 0.07 },
    ];

    for (const config of layerConfig) {
      for (let i = 0; i < config.count; i++) {
        this.stars.push({
          worldX: Math.random() * canvasWidth,
          worldY: Math.random() * canvasHeight,
          r: config.r,
          opacity: config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin),
          drift: (Math.random() - 0.5) * config.driftMax * 2,
          layer: config.layer,
        });
      }
    }
  }

  /**
   * drawWithParallax — render stars with parallax offset from camera drift
   * @param renderer  — the renderer
   * @param cameraDriftX — accumulated camera drift in X
   * @param cameraDriftY — accumulated camera drift in Y
   * @param heading    — jellyfish heading in radians (used for directional bias)
   */
  drawWithParallax(
    renderer: Renderer,
    cameraDriftX: number,
    cameraDriftY: number,
    heading: number,
  ): void {
    const parallaxFactors: Record<Star['layer'], number> = {
      far:  0.30,
      mid:  0.60,
      near: 0.90,
    };

    // Directional bias: stars lead slightly in direction of travel
    // heading=0 (moving right) → bias rightward parallax
    const leadBiasX = Math.cos(heading) * 2;
    const leadBiasY = Math.sin(heading) * 2;

    for (const star of this.stars) {
      const pf = parallaxFactors[star.layer];

      // Apply parallax: camera drift * factor
      let sx = star.worldX - cameraDriftX * pf + leadBiasX * pf;
      let sy = star.worldY - cameraDriftY * pf + leadBiasY * pf + star.drift;

      // Wrap off-screen stars to opposite edge
      if (sx < 0) sx += this.canvasWidth;
      if (sx > this.canvasWidth) sx -= this.canvasWidth;
      if (sy < 0) sy += this.canvasHeight;
      if (sy > this.canvasHeight) sy -= this.canvasHeight;

      renderer.ctx.globalAlpha = star.opacity;
      renderer.ctx.fillStyle = '#ffffff';
      renderer.ctx.beginPath();
      renderer.ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
      renderer.ctx.fill();
    }

    renderer.ctx.globalAlpha = 1.0;
  }
}
