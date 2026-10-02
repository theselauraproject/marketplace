"use client";

import { useEffect, useState } from "react";

import { SkinViewer3D } from "@/components/skins/SkinViewer3D";
import { getFocusForSlot } from "@/components/skins/SkinThumbnail";
import { compositePieceOverNeutralBase } from "@/lib/skin-compositor";
import type { SkinKind, SkinSlot, SkinVariant } from "@/lib/skins-api";

interface SkinDetailViewerProps {
  imageUrl: string;
  variant?: SkinVariant;
  kind: SkinKind;
  pieceSlot?: SkinSlot | null;
  width?: number;
  height?: number;
}

export function SkinDetailViewer({
  imageUrl,
  variant,
  kind,
  pieceSlot,
  width = 252,
  height = 320,
}: SkinDetailViewerProps) {
  const [src, setSrc] = useState<string | null>(
    kind === "piece" ? null : imageUrl,
  );

  useEffect(() => {
    if (kind !== "piece") {
      setSrc(imageUrl);
      return;
    }

    let cancelled = false;

    compositePieceOverNeutralBase(imageUrl, variant ?? "classic")
      .then((url) => {
        if (!cancelled) {
          setSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(imageUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, kind, variant]);

  if (!src) {
    return <div style={{ width, height }} />;
  }

  return (
    <SkinViewer3D
      src={src}
      model={variant === "slim" ? "slim" : "default"}
      focus={kind === "piece" ? getFocusForSlot(pieceSlot ?? undefined) : "full"}
      width={width}
      height={height}
    />
  );
}
