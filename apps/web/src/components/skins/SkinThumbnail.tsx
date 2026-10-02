"use client";

import { useEffect, useRef, useState } from "react";

import {
  SkinViewer3D,
  type SkinViewerFocus,
} from "@/components/skins/SkinViewer3D";
import {
  compositePieceOverNeutralBase,
  compositeSkinLayers,
  getNeutralBaseSkinUrl,
} from "@/lib/skin-compositor";
import type { SkinKind, SkinSlot, SkinVariant } from "@/lib/skins-api";

export function getFocusForSlot(slot: SkinSlot | undefined): SkinViewerFocus {
  switch (slot) {
    case "hair":
    case "face":
    case "headwear":
      return "head";
    case "top":
    case "jacket":
    case "accessory":
      return "body";
    case "sleeve_left":
      return "left-arm";
    case "sleeve_right":
      return "right-arm";
    case "legs":
    case "shoes":
      return "legs";
    default:
      return "full";
  }
}

interface SkinThumbnailProps {
  imageUrl: string;
  name: string;
  variant?: SkinVariant;
  kind?: SkinKind;
  pieceSlot?: SkinSlot | null;
  layersBefore?: string[];
  layersAfter?: string[];
  width?: number;
  height?: number;
}

export function SkinThumbnail({
  imageUrl,
  name,
  variant,
  kind = "full",
  pieceSlot,
  layersBefore,
  layersAfter,
  width = 140,
  height = 170,
}: SkinThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(
    kind === "piece" ? null : imageUrl,
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(Boolean(entries[entries.length - 1]?.isIntersecting));
      },
      { rootMargin: "150px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const beforeKey = JSON.stringify(layersBefore ?? []);
  const afterKey = JSON.stringify(layersAfter ?? []);

  useEffect(() => {
    if (kind !== "piece") {
      setPreviewSrc(imageUrl);
      return;
    }

    let cancelled = false;

    const before: string[] = JSON.parse(beforeKey);
    const after: string[] = JSON.parse(afterKey);

    const work =
      before.length > 0 || after.length > 0
        ? compositeSkinLayers([
            getNeutralBaseSkinUrl(variant ?? "classic"),
            ...before,
            imageUrl,
            ...after,
          ]).then((canvas) => canvas.toDataURL("image/png"))
        : compositePieceOverNeutralBase(imageUrl, variant ?? "classic");

    work
      .then((url) => {
        if (!cancelled) {
          setPreviewSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewSrc(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, kind, variant, beforeKey, afterKey]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      style={{ width: "100%", height }}
    >
      {inView && previewSrc ? (
        <SkinViewer3D
          src={previewSrc}
          model={variant === "slim" ? "slim" : "default"}
          focus={kind === "piece" ? getFocusForSlot(pieceSlot ?? undefined) : "full"}
          width={width}
          height={height}
          interactive={false}
        />
      ) : (
        <img
          src={imageUrl}
          alt={name}
          style={{
            imageRendering: "pixelated",
            maxWidth: width * 0.6,
            maxHeight: height * 0.6,
          }}
          className="object-contain opacity-40"
        />
      )}
    </div>
  );
}
