/**
 * Client-side before/after image compositing for the Social Post Helper.
 *
 * When a completed groom already has BOTH a before and an after photo (captured
 * in the completion flow and stored as data URLs on the appointment's report),
 * we stitch them side by side on a canvas — a square, Instagram-ready image with
 * BEFORE / AFTER labels and the business name in the corner. No upload, no new
 * storage: it reads the photos that already exist and downloads a PNG.
 *
 * Browser-only (uses <canvas> / Image); call it from a click handler.
 */

/** True only for a real image source we can draw (data URL or http(s)). */
export function isRealPhoto(src?: string): src is string {
  return !!src && (src.startsWith("data:") || src.startsWith("http"));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed so an http(s) photo doesn't taint the canvas (data: URLs are fine).
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

/** Draw `img` to cover the target box (object-fit: cover, centred crop). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const scale = Math.max(dw / img.width, dh / img.height);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.font = "600 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const padX = 20;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 52;
  ctx.fillStyle = "rgba(42,36,34,0.72)";
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.fillStyle = "#FCF6F4";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, x + padX, y + h / 2 + 1);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Compose a square before|after PNG. Returns a Blob, or null if the browser
 * can't produce one (e.g. a cross-origin photo tainted the canvas).
 */
export async function composeBeforeAfter(opts: {
  before: string;
  after: string;
  businessName: string;
}): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Warm off-white background (matches the app), shows through the divider gap.
  ctx.fillStyle = "#FCF6F4";
  ctx.fillRect(0, 0, size, size);

  const [before, after] = await Promise.all([loadImage(opts.before), loadImage(opts.after)]);
  const half = size / 2;
  const gap = 4;
  drawCover(ctx, before, 0, 0, half - gap / 2, size);
  drawCover(ctx, after, half + gap / 2, 0, half - gap / 2, size);

  drawLabel(ctx, "BEFORE", 24, 24);
  drawLabel(ctx, "AFTER", half + 24, 24);

  // Business name, bottom-centred on a soft strip so it reads on any photo.
  const name = opts.businessName.trim();
  if (name) {
    ctx.font = "600 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(name).width;
    const stripH = 68;
    const stripW = Math.min(tw + 56, size - 48);
    roundRect(ctx, (size - stripW) / 2, size - stripH - 24, stripW, stripH, 34);
    ctx.fillStyle = "rgba(42,36,34,0.72)";
    ctx.fill();
    ctx.fillStyle = "#FCF6F4";
    ctx.fillText(name, size / 2, size - 24 - stripH / 2 + 1);
  }

  return await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null); // tainted canvas (cross-origin) — caller shows a message
    }
  });
}

/** Trigger a browser download of a Blob under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
