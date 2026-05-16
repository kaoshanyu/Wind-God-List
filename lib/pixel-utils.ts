export const PS = 4;
export const W = 100;
export const H = 75;
export const CANVAS_W = W * PS;
export const CANVAS_H = H * PS;

export function px(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x * PS), Math.round(y * PS), Math.round(w * PS), Math.round(h * PS));
}
