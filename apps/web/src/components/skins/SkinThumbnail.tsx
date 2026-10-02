"use client";

import { useEffect, useRef, useState } from "react";

import {
  SkinViewer3D,
  type SkinViewerFocus,
} from "@/components/skins/SkinViewer3D";
import { compositePieceOverNeutralBase } from "@/lib/skin-compositor";
import type { SkinKind, SkinSlot, SkinVariant } from "@/lib/skins-api";

/** Which body part a piece slot should zoom the preview in on. */
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
  /** When "piece", the raw layer is composited over a neutral base body and
   *  the camera zooms into pieceSlot's body part, instead of showing the
   *  bare (mostly transparent) layer on its own. */
  kind?: SkinKind;
  pieceSlot?: SkinSlot | null;
  width?: number;
  height?: number;
}

/**
 * Renders the real 3D preview once the thumbnail actually scrolls into
 * view, and a lightweight flat texture before that — a grid of dozens of
 * live WebGL viewers all at once would blow past browsers' concurrent
 * context limits.
 */
export function SkinThumbnail({
  imageUrl,
  name,
  variant,
  kind = "full",
  pieceSlot,
  width = 140,
  height = 170,
}: SkinThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(imageUrl);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (kind !== "piece") {
      setPreviewSrc(imageUrl);
      return;
    }

    let cancelled = false;

    compositePieceOverNeutralBase(imageUrl)
      .then((url) => {
        if (!cancelled) {
          setPreviewSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewSrc(imageUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, kind]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      style={{ width: "100%", height }}
    >
      {inView ? (
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
