import type { Creature } from '../creatures/Creature.js';
import type { Renderer } from './Renderer.js';
import type { Starfield } from './Starfield.js';

/**
 * Scene — manages render order: background → starfield → creature → HUD
 *
 * T-06G adds tracked-target composition:
 * - Camera drift accumulation with dead-zone retention
 * - Stars rendered with parallax offset from camera drift
 * - Jellyfish stays near canvas center; world moves around it
 * - HUD reflects tracked frame state (heading, bank, y_off from tracked position)
 *
 * T-06F adds: drawHUD() — amber HUD layer (rails, labels, telemetry)
 */
export class Scene {
  private renderer: Renderer;
  private starfield: Starfield;
  private creatures: Creature[] = [];

  // T-06G: camera drift state — accumulates as jellyfish moves through world
  private cameraDriftX = 0;
  private cameraDriftY = 0;

  // T-06G: dead-zone constants (canvas 240×240)
  private readonly DZ_CX = 120;
  private readonly DZ_CY = 120;
  private readonly DZ_HALF_W = 28;   // jellyfish may drift ±28px horizontally
  private readonly DZ_HALF_H = 22;   // jellyfish may drift ±22px vertically
  private readonly RETENTION = 0.85; // per-frame snap strength (0-1)

  // Telemetry accessor — set by addCreature
  private creatureTelemetry: ((t: number) => {
    x: number; y: number;
    heading: number; bankDeg: number;
    y_off: number; pulseAmplitude: number;
  }) | null = null;

  constructor(
    renderer: Renderer,
    starfield: Starfield,
  ) {
    this.renderer = renderer;
    this.starfield = starfield;
  }

  addCreature(creature: Creature): void {
    this.creatures.push(creature);
    if ('getTelemetry' in creature && typeof (creature as any).getTelemetry === 'function') {
      this.creatureTelemetry = (t: number) => (creature as any).getTelemetry(t);
    }
  }

  drawFrame(t: number): void {
    const { renderer, starfield, creatures } = this;

    // ─── 1. Background ───
    renderer.drawBackground('#0a0e14');

    // ─── 2. Camera drift + dead-zone retention (T-06G) ───
    if (this.creatureTelemetry && creatures.length > 0) {
      const tele = this.creatureTelemetry(t);

      // Screen position of creature = world position minus accumulated camera drift
      const screenX = tele.x - this.cameraDriftX;
      const screenY = tele.y - this.cameraDriftY;

      const dxFromCenter = screenX - this.DZ_CX;
      const dyFromCenter = screenY - this.DZ_CY;

      // If creature is outside dead-zone, snap camera drift to re-center it
      if (Math.abs(dxFromCenter) > this.DZ_HALF_W || Math.abs(dyFromCenter) > this.DZ_HALF_H) {
        this.cameraDriftX += dxFromCenter * this.RETENTION;
        this.cameraDriftY += dyFromCenter * this.RETENTION;
      }
      // else: creature inside zone — camera drift unchanged (world moves, subject held)

      // Recompute screen position after drift update
      const finalScreenX = tele.x - this.cameraDriftX;
      const finalScreenY = tele.y - this.cameraDriftY;

      // ─── 3. Starfield with parallax (T-06G) ───
      // Stars shift in opposite direction of camera drift (world moves opposite to drift)
      starfield.drawWithParallax(renderer, this.cameraDriftX, this.cameraDriftY, tele.heading);

      // ─── 4. Creature at tracked screen position (T-06G) ───
      // Camera translation: offset so creature appears at its tracked screen position
      renderer.ctx.save();
      renderer.ctx.translate(finalScreenX, finalScreenY);

      for (const creature of creatures) {
        creature.draw(renderer.ctx, t);
      }

      renderer.ctx.restore();

      // ─── 5. HUD layer — tracked telemetry (T-06G) ───
      const trackedTele = {
        x: finalScreenX,
        y: finalScreenY,
        heading: tele.heading,
        bankDeg: tele.bankDeg,
        y_off: finalScreenY - this.DZ_CY,    // tracked y deviation from center
        pulseAmplitude: tele.pulseAmplitude,
      };
      this.drawHUD(renderer.ctx, trackedTele);
    } else {
      // No creature telemetry yet — draw stars at origin
      starfield.drawWithParallax(renderer, 0, 0, 0);
    }
  }

  /**
   * drawHUD — amber retro tracking overlay
   * Renders: dotted crosshair rails, sector labels, telemetry block
   * Updated for T-06G: heading in radians, bankDeg, tracked y_off, pulseAmplitude
   */
  private drawHUD(
    ctx: CanvasRenderingContext2D,
    tele: { x: number; y: number; heading: number; bankDeg: number; y_off: number; pulseAmplitude: number }
  ): void {
    ctx.save();
    ctx.setLineDash([5, 5]);

    // ─── Crosshair rails at canvas center ───
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(255, 204, 0, 0.3)';
    ctx.shadowBlur = 3;

    // Vertical rail at x=120
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(120, 240);
    ctx.stroke();

    // Horizontal rail at y=120
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(240, 120);
    ctx.stroke();

    ctx.setLineDash([]);

    // ─── Sector corner markers (L-shaped brackets) ───
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 2;

    const cornerSize = 14;
    const corners: [number, number][] = [
      [0, 0],
      [240, 0],
      [0, 240],
      [240, 240],
    ];

    for (const [cx, cy] of corners) {
      const flipX = cx === 240 ? -1 : 1;
      const flipY = cy === 240 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + flipX * cornerSize, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + flipY * cornerSize);
      ctx.stroke();
    }

    // ─── Sector labels ───
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'center';

    const labels: [string, number, number][] = [
      ['T',  120, 10],
      ['B',  120, 234],
      ['L',  8,   120],
      ['R',  232, 120],
      ['TL', 10,  10],
      ['TR', 230, 10],
      ['BL', 10,  234],
      ['BR', 230, 234],
    ];

    for (const [label, x, y] of labels) {
      ctx.fillText(label, x, y);
    }

    // ─── Heading compass arc (T-06G) ───
    // Draw a small arc at the bottom-center indicating heading direction
    const compassX = 120;
    const compassY = 222;
    const compassR = 10;
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2);
    ctx.stroke();
    // Heading needle
    const needleAngle = tele.heading - Math.PI / 2; // adjust so 0 rad = up
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(compassX, compassY);
    ctx.lineTo(
      compassX + compassR * 0.8 * Math.cos(needleAngle),
      compassY + compassR * 0.8 * Math.sin(needleAngle)
    );
    ctx.stroke();

    // ─── Bell pulse bar (T-06G) ───
    // Horizontal bar bottom-left showing bell contraction state
    const pulseBarX = 4;
    const pulseBarY = 205;
    const pulseBarW = 40;
    const pulseBarH = 5;
    ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
    ctx.fillRect(pulseBarX, pulseBarY, pulseBarW, pulseBarH);
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(pulseBarX, pulseBarY, pulseBarW, pulseBarH);
    const fillW = tele.pulseAmplitude * pulseBarW;
    ctx.fillStyle = 'rgba(255, 204, 0, 0.7)';
    ctx.fillRect(pulseBarX, pulseBarY, fillW, pulseBarH);

    // ─── Bank indicator (T-06G) ───
    // Small bank bar near compass
    const bankBarX = 4;
    const bankBarY = 213;
    const bankBarW = 40;
    const bankBarH = 5;
    ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
    ctx.fillRect(bankBarX, bankBarY, bankBarW, bankBarH);
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bankBarX, bankBarY, bankBarW, bankBarH);
    const bankNorm = (tele.bankDeg + 10) / 20; // map -10..10 → 0..1
    const bankFillX = bankBarX + bankNorm * bankBarW - 2;
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(bankFillX, bankBarY, 4, bankBarH);

    // ─── Telemetry block — bottom-right ───
    ctx.textAlign = 'left';
    ctx.font = '8px monospace';
    ctx.shadowBlur = 2;

    const headingDeg = Math.round(tele.heading * (180 / Math.PI));
    const fps = 60;
    const lines = [
      `Y_OFF  ${tele.y_off >= 0 ? '+' : ''}${Math.round(tele.y_off)}`,
      `HDG   ${headingDeg >= 0 ? headingDeg : headingDeg + 360}`,
      `BNK    ${tele.bankDeg >= 0 ? '+' : ''}${Math.round(tele.bankDeg)}`,
      `MODE   SWIM`,
      `FPS    ${fps}`,
    ];

    const boxX = 4;
    const boxY = 174;
    const lineH = 13;
    const boxW = 90;
    const boxH = lines.length * lineH + 6;

    ctx.fillStyle = 'rgba(10, 14, 20, 0.75)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + 4, boxY + 11 + i * lineH);
    }

    // ─── Tether line from T label to creature apex ───
    // Creature apex in screen space: tele.y - 60 (dome height)
    const creatureApexScreenY = tele.y - 60;

    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 1;
    ctx.beginPath();
    ctx.moveTo(120, 10 + 8);         // from T label
    ctx.lineTo(120, creatureApexScreenY); // to creature apex
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}
