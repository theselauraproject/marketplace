import { loadImage } from "@/lib/skin-image";
import type { SkinVariant } from "@/lib/skins-api";

export { loadImage };

export const SKIN_CANVAS_SIZE = 64;

const NEUTRAL_BASE_GRAY = 176;

const SIDE_TOP_LIGHTEN = 0.04;
const SIDE_BOTTOM_DARKEN = 0.08;

function getBaseBoxes(
  variant: SkinVariant,
): ReadonlyArray<readonly [number, number, number, number, number]> {
  const armWidth = variant === "slim" ? 3 : 4;

  return [
    [0, 0, 8, 8, 8],
    [16, 16, 8, 12, 4],
    [40, 16, armWidth, 12, 4],
    [0, 16, 4, 12, 4],
    [32, 48, armWidth, 12, 4],
    [16, 48, 4, 12, 4],
  ];
}

const neutralBaseSkinUrls: Partial<Record<SkinVariant, string>> = {};

function paintFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fade: boolean,
) {
  for (let py = 0; py < h; py++) {
    const t = h > 1 ? py / (h - 1) : 0;
    const factor = fade
      ? 1 + SIDE_TOP_LIGHTEN * (1 - t) - SIDE_BOTTOM_DARKEN * t
      : 1;

    const value = Math.max(0, Math.min(255, Math.round(NEUTRAL_BASE_GRAY * factor)));

    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(x, y + py, w, 1);
  }
}

export function getNeutralBaseSkinUrl(variant: SkinVariant = "classic"): string {
  const cached = neutralBaseSkinUrls[variant];

  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SKIN_CANVAS_SIZE;
  canvas.height = SKIN_CANVAS_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D is not supported in this browser");
  }

  for (const [u, v, w, h, d] of getBaseBoxes(variant)) {
    paintFace(ctx, u + d, v, w, d, false);
    paintFace(ctx, u + d + w, v, w, d, false);
    paintFace(ctx, u, v + d, d, h, true);
    paintFace(ctx, u + d, v + d, w, h, true);
    paintFace(ctx, u + d + w, v + d, d, h, true);
    paintFace(ctx, u + 2 * d + w, v + d, w, h, true);
  }

  const url = canvas.toDataURL("image/png");
  neutralBaseSkinUrls[variant] = url;
  return url;
}

export async function compositePieceOverNeutralBase(
  pieceUrl: string,
  variant: SkinVariant = "classic",
): Promise<string> {
  const canvas = await compositeSkinLayers([
    getNeutralBaseSkinUrl(variant),
    pieceUrl,
  ]);
  return canvas.toDataURL("image/png");
}

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
    drawSkinLayer(ctx, img);
  }

  return canvas;
}

const LEGACY_MIRROR_COPIES: ReadonlyArray<
  readonly [number, number, number, number, number, number]
> = [
  [4, 16, 4, 4, 20, 48],
  [8, 16, 4, 4, 24, 48],
  [0, 20, 4, 12, 24, 52],
  [4, 20, 4, 12, 20, 52],
  [8, 20, 4, 12, 16, 52],
  [12, 20, 4, 12, 28, 52],
  [44, 16, 4, 4, 36, 48],
  [48, 16, 4, 4, 40, 48],
  [40, 20, 4, 12, 40, 52],
  [44, 20, 4, 12, 36, 52],
  [48, 20, 4, 12, 32, 52],
  [52, 20, 4, 12, 44, 52],
];

function drawSkinLayer(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const isLegacy =
    img.width === SKIN_CANVAS_SIZE && img.height === SKIN_CANVAS_SIZE / 2;

  if (!isLegacy) {
    ctx.drawImage(img, 0, 0, SKIN_CANVAS_SIZE, SKIN_CANVAS_SIZE);
    return;
  }

  const source = document.createElement("canvas");
  source.width = img.width;
  source.height = img.height;
  source.getContext("2d")?.drawImage(img, 0, 0);

  ctx.drawImage(img, 0, 0);

  for (const [sx, sy, w, h, dx, dy] of LEGACY_MIRROR_COPIES) {
    ctx.save();
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, w, h, 0, 0, w, h);
    ctx.restore();
  }
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
