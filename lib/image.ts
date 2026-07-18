/**
 * Client-side image helpers. Used to turn a groomer's uploaded logo into a
 * small, square, consistent asset before it's stored — so we never ship a
 * 4000px phone photo to the booking page.
 */

/**
 * Center-crop an image file to a square and scale it to `size`×`size`, returning
 * both a PNG Blob (for upload) and a data URL (for an instant preview / the demo
 * fallback). Runs entirely in the browser — no upload, no dependencies.
 */
export async function resizeImageToSquare(
  file: File,
  size = 256,
): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");

  // Center-crop to a square, then scale down.
  const min = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - min) / 2;
  const sy = (bitmap.height - min) / 2;
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))),
      "image/png",
    ),
  );
  return { blob, dataUrl };
}
