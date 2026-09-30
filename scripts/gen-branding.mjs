/**
 * Generates all Callers brand assets as deterministic pixel art:
 *   public/branding/pfp.png     1024×1024 (32×32 grid ×32)
 *   public/branding/banner.png  1500×500
 *   public/branding/og.png      1200×630
 *   public/favicon-32.png       32×32
 *   app/icon.png                256×256 (Next.js favicon)
 */
import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── palette ──────────────────────────────────────────────────────────
const BG = [10, 10, 12];
const GREEN = [255, 62, 157];      // signal magenta (primary; name kept as GREEN)
const GREEN_DIM = [92, 19, 56];    // deep magenta shadow
const GREEN_HI = [255, 163, 206];  // light pink highlight
const TEXT = [232, 230, 225];
const MUTED = [110, 110, 118];
const AMBER = [255, 178, 36];
const STEEL = [196, 198, 210];     // megaphone body highlight

// ── tiny raster helpers ──────────────────────────────────────────────
function makeCanvas(w, h, bg = BG) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = bg[0];
    png.data[i * 4 + 1] = bg[1];
    png.data[i * 4 + 2] = bg[2];
    png.data[i * 4 + 3] = 255;
  }
  return png;
}
function px(png, x, y, c, a = 1) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) * 4;
  png.data[i] = Math.round(c[0] * a + png.data[i] * (1 - a));
  png.data[i + 1] = Math.round(c[1] * a + png.data[i + 1] * (1 - a));
  png.data[i + 2] = Math.round(c[2] * a + png.data[i + 2] * (1 - a));
  png.data[i + 3] = 255;
}
function rect(png, x, y, w, h, c, a = 1) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(png, x + i, y + j, c, a);
}
function save(png, path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
  console.log("wrote", path);
}

// ── 5×7 pixel font ───────────────────────────────────────────────────
const FONT = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01111","10000","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  J: ["00111","00010","00010","00010","00010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","11011","10001"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  0: ["01110","10001","10011","10101","11001","10001","01110"],
  1: ["00100","01100","00100","00100","00100","00100","01110"],
  2: ["01110","10001","00001","00110","01000","10000","11111"],
  3: ["11110","00001","00001","01110","00001","00001","11110"],
  4: ["00010","00110","01010","10010","11111","00010","00010"],
  5: ["11111","10000","10000","11110","00001","00001","11110"],
  6: ["01110","10000","10000","11110","10001","10001","01110"],
  7: ["11111","00001","00010","00100","01000","01000","01000"],
  8: ["01110","10001","10001","01110","10001","10001","01110"],
  9: ["01110","10001","10001","01111","00001","00001","01110"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  ",": ["00000","00000","00000","00000","00110","00110","01100"],
  "+": ["00000","00100","00100","11111","00100","00100","00000"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  ":": ["00000","01100","01100","00000","01100","01100","00000"],
  ">": ["01000","00100","00010","00001","00010","00100","01000"],
  "[": ["01110","01000","01000","01000","01000","01000","01110"],
  "]": ["01110","00010","00010","00010","00010","00010","01110"],
  "=": ["00000","00000","11111","00000","11111","00000","00000"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};
function drawText(png, text, x, y, scale, color) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (glyph[r][c] === "1") rect(png, cx + c * scale, y + r * scale, scale, scale, color);
      }
    }
    cx += 6 * scale;
  }
  return cx - x;
}
function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}

// ── the megaphone mark (24×24 cell grid) ────────────────────────────
// A pixel megaphone: steel mouthpiece, magenta cone opening right, handle
// underneath, and three broadcast arcs — the call going out.
function drawMark(png, ox, oy, s) {
  const P = (x, y, c) => {
    if (x < 0 || y < 0 || x > 23 || y > 23) return;
    rect(png, ox + x * s, oy + y * s, s, s, c);
  };
  const cy = 11.5;
  const X0 = 4, X1 = 16, H0 = 2.5, H1 = 8;

  // cone
  for (let x = X0; x <= X1; x++) {
    const t = (x - X0) / (X1 - X0);
    const half = H0 + t * (H1 - H0);
    const y0 = Math.round(cy - half);
    const y1 = Math.round(cy + half);
    for (let y = y0; y <= y1; y++) P(x, y, GREEN);
    P(x, y0, GREEN_HI);   // top edge catches the light
    P(x, y1, GREEN_DIM);  // bottom edge in shadow
  }
  // front rim
  {
    const y0 = Math.round(cy - H1), y1 = Math.round(cy + H1);
    for (let y = y0; y <= y1; y++) P(X1, y, GREEN_HI);
  }

  // mouthpiece
  for (let y = 9; y <= 14; y++) for (let x = 2; x <= 3; x++) P(x, y, STEEL);
  for (let y = 9; y <= 14; y++) P(2, y, GREEN_DIM);

  // handle, tucked up under the cone so it reads as attached
  for (let y = 16; y <= 20; y++) for (let x = 8; x <= 10; x++) P(x, y, STEEL);
  for (let x = 8; x <= 10; x++) P(x, 20, GREEN_DIM);
  P(8, 16, GREEN_DIM);

  // three broadcast arcs
  for (const [ax, spread] of [[18, 3], [20, 5], [22, 7]]) {
    for (let dy = -spread; dy <= spread; dy++) {
      const bow = Math.round(Math.sqrt(Math.max(0, spread * spread - dy * dy)) * 0.3);
      P(Math.min(23, ax + bow), Math.round(cy + dy), GREEN_HI);
    }
  }
}

// ── PFP 1024×1024 ────────────────────────────────────────────────────
{
  const S = 1024, cell = S / 32;
  const png = makeCanvas(S, S);
  // faint grid dots (terminal field)
  for (let y = 0; y < 32; y += 2) for (let x = 0; x < 32; x += 2)
    rect(png, x * cell, y * cell, 2, 2, GREEN_DIM, 0.35);
  // subtle top scanline band
  for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x++) px(png, x, y, [0, 0, 0], 0.12);
  // mark centered: 24-cell grid at cell scale, offset 4 cells
  drawMark(png, 4 * cell, 3 * cell, cell);
  // baseline tick marks (bottom)
  for (let x = 6; x <= 26; x += 4) rect(png, x * cell, 29 * cell + cell / 2, cell, cell / 4, GREEN_DIM);
  save(png, join(root, "public/branding/pfp.png"));
}

// ── favicon + app icon ───────────────────────────────────────────────
{
  const png = makeCanvas(32, 32);
  drawMark(png, 4, 3, 1);
  save(png, join(root, "public/favicon-32.png"));
  const big = makeCanvas(256, 256);
  drawMark(big, 32, 24, 8);
  save(big, join(root, "app/icon.png"));
}

// ── banner 1500×500 ──────────────────────────────────────────────────
{
  const W = 1500, H = 500;
  const png = makeCanvas(W, H);
  // scanlines
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) px(png, x, y, [0, 0, 0], 0.18);
  // faint grid
  for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40)
    rect(png, x, y, 2, 2, GREEN_DIM, 0.5);

  // mark, left side (safe area: X crops ~ sides on some clients; keep 100px margin)
  drawMark(png, 120, 106, 12); // 24*12 = 288px tall

  // wordmark
  const wx = 470, wy = 150;
  drawText(png, "CALL", wx, wy, 9, TEXT);
  drawText(png, "ERS", wx + textWidth("CALL", 9) + 12, wy, 9, GREEN);
  // block cursor after wordmark
  rect(png, wx + textWidth("CALLERS", 9) + 30, wy, 24, 63, GREEN);

  // tagline
  drawText(png, "THE PEOPLE WHO CALLED IT GET PAID.", wx + 4, wy + 92, 3, MUTED);

  // pipeline diagram, right-lower: [CREATE]+[BUY]+[LOCK] = SLOT 0
  const dy = 330;
  let dx = 470;
  const box = (label, color) => {
    const w = textWidth(label, 3) + 28;
    rect(png, dx, dy, w, 44, GREEN_DIM, 0.55);
    // border
    rect(png, dx, dy, w, 2, color); rect(png, dx, dy + 42, w, 2, color);
    rect(png, dx, dy, 2, 44, color); rect(png, dx + w - 2, dy, 2, 44, color);
    drawText(png, label, dx + 14, dy + 12, 3, color);
    dx += w + 10;
  };
  box("CALL IT", TEXT);
  drawText(png, "+", dx + 2, dy + 12, 3, MUTED); dx += 26;
  box("IT LAUNCHES", TEXT);
  drawText(png, "+", dx + 2, dy + 12, 3, MUTED); dx += 26;
  box("YOU EARN", GREEN);
  drawText(png, "=", dx + 6, dy + 12, 3, MUTED); dx += 32;
  // final block: ONE SLOT
  const finalLabel = "EVERY TRADE.";
  const fw = textWidth(finalLabel, 3) + 28;
  rect(png, dx, dy, fw, 44, GREEN, 1);
  drawText(png, finalLabel, dx + 14, dy + 12, 3, BG);

  // url bottom-left
  drawText(png, "CALLERSLAUNCH.LOL", 120, 440, 3, GREEN_HI);
  save(png, join(root, "public/branding/banner.png"));
}

// ── OG image 1200×630 ────────────────────────────────────────────────
{
  const W = 1200, H = 630;
  const png = makeCanvas(W, H);
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) px(png, x, y, [0, 0, 0], 0.18);
  drawMark(png, 90, 130, 11);
  const wx = 420, wy = 190;
  drawText(png, "CALL", wx, wy, 8, TEXT);
  drawText(png, "ERS", wx + textWidth("CALL", 8) + 10, wy, 8, GREEN);
  rect(png, wx + textWidth("CALLERS", 8) + 26, wy, 20, 56, GREEN);
  drawText(png, "THE PEOPLE WHO CALLED IT", wx + 2, wy + 84, 4, MUTED);
  drawText(png, "CALL A COIN BEFORE IT LAUNCHES AND", wx + 2, wy + 140, 3, TEXT);
  drawText(png, "EARN ITS FEES ON EVERY TRADE", wx + 2, wy + 172, 3, TEXT);
  drawText(png, "CALLERSLAUNCH.LOL", wx + 2, 520, 3, GREEN);
  save(png, join(root, "public/branding/og.png"));
}

console.log("branding assets generated");
