import type { DrawCommand } from "./types";

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const PALETTE = [
  "#ffffff",
  "#c1c1c1",
  "#ef130b",
  "#ff7100",
  "#ffe400",
  "#00cc00",
  "#00b2ff",
  "#231fd7",
  "#a300ba",
  "#d37caa",
  "#a0522d",
  "#000000",
  "#005493",
  "#06989a",
  "#6c71c4",
  "#b58900",
  "#cb4b16",
  "#dc322f",
  "#d33682",
  "#268bd2",
  "#2aa198",
  "#859900"
];

function parseColor(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

export function replay(ctx: CanvasRenderingContext2D, cmds: DrawCommand[]) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const cmd of cmds) applyCommand(ctx, cmd);
  ctx.restore();
}

export function applyCommand(ctx: CanvasRenderingContext2D, cmd: DrawCommand) {
  if (cmd.type === "clear") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return;
  }
  if (cmd.type === "line") {
    const color = PALETTE[cmd.c % PALETTE.length] ?? "#000000";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cmd.w);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cmd.x0, cmd.y0);
    ctx.lineTo(cmd.x1, cmd.y1);
    ctx.stroke();
    return;
  }
  if (cmd.type === "fill") {
    floodFill(ctx, cmd.x, cmd.y, PALETTE[cmd.c % PALETTE.length] ?? "#000000");
  }
}

function matchColor(a: Uint8ClampedArray, i: number, t: { r: number; g: number; b: number; a: number }) {
  return a[i] === t.r && a[i + 1] === t.g && a[i + 2] === t.b && a[i + 3] === t.a;
}

function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, fillHex: string) {
  const xi = Math.max(0, Math.min(CANVAS_W - 1, Math.floor(x)));
  const yi = Math.max(0, Math.min(CANVAS_H - 1, Math.floor(y)));

  const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  const data = img.data;
  const targetIdx = (yi * CANVAS_W + xi) * 4;
  const fill = parseColor(fillHex);
  const target = {
    r: data[targetIdx]!,
    g: data[targetIdx + 1]!,
    b: data[targetIdx + 2]!,
    a: data[targetIdx + 3]!
  };

  if (target.r === fill.r && target.g === fill.g && target.b === fill.b && target.a === fill.a) return;

  const stack: number[] = [xi, yi];
  const seen = new Uint8Array(CANVAS_W * CANVAS_H);

  while (stack.length) {
    const py = stack.pop()!;
    const px = stack.pop()!;
    if (px < 0 || py < 0 || px >= CANVAS_W || py >= CANVAS_H) continue;
    const p = py * CANVAS_W + px;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!matchColor(data, i, target)) continue;
    data[i] = fill.r;
    data[i + 1] = fill.g;
    data[i + 2] = fill.b;
    data[i + 3] = fill.a;
    stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
  }

  ctx.putImageData(img, 0, 0);
}
