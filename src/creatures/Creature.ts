export interface Creature {
  draw(ctx: CanvasRenderingContext2D, t: number): void;
  // t = elapsed time in seconds since creature instantiation
  // motion must be purely a function of t (deterministic, loopable)
}
