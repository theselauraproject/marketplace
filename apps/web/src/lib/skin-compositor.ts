export const SKIN_CANVAS_SIZE = 64;

// A flat, warm skin-tone fill used as a stand-in body for previewing a
// single piece layer on its own (hair, headwear, a sleeve, etc). Pieces are
// authored with everything except that one part transparent, so viewing the
// raw file alone renders as a mostly-invisible body with a fragment floating
// on it. Filling the whole 64x64 template with one color paints every UV
// face consistently regardless of layout, so it reads as a plain body
// instead of needing a hand-authored base skin asset.
const NEUTRAL_BASE_SKIN_COLOR = "#caa06f";

let neutralBaseSkinUrl: string | null = null;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load skin texture"));
    img.src = src;
  });
}

/**
 * A plain skin-toned 64x64 texture, generated once and cached, used as the
 * backdrop layer when previewing an individual piece.
 */
export function getNeutralBaseSkinUrl(): string {
  if (neutralBaseSkinUrl) {
    return neutralBaseSkinUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SKIN_CANVAS_SIZE;
  canvas.height = SKIN_CANVAS_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D is not supported in this browser");
  }

  ctx.fillStyle = NEUTRAL_BASE_SKIN_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  neutralBaseSkinUrl = canvas.toDataURL("image/png");
  return neutralBaseSkinUrl;
}

/**
 * Composites a single piece layer over the neutral base so it previews as
 * "the piece on a plain body" instead of "the piece on nothing".
 */
export async function compositePieceOverNeutralBase(
  pieceUrl: string,
): Promise<string> {
  const canvas = await compositeSkinLayers([
    getNeutralBaseSkinUrl(),
    pieceUrl,
  ]);
  return canvas.toDataURL("image/png");
}

/**
 * Layers a stack of same-size skin textures onto a single canvas, in order —
 * later layers draw on top of earlier ones, and transparent pixels let the
 * layer underneath show through. Since every piece is authored against the
 * same 64x64 Minecraft skin template, stacking them lines the parts up
 * automatically without needing to know the UV layout.
 */
export async function compositeSkinLayers(
  layerUrls: string[],
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = SKIN_CANVAS_SIZE;
  canvas.height = SKIN_CANVAS_SIZE;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D is not supported in this browser");
  }

  ctx.imageSmoothingEnabled = false;

  for (const url of layerUrls) {
    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to export the composited skin"));
      }
    }, "image/png");
  });
}
