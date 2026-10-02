"use client";

import { useEffect, useRef } from "react";
import type { SkinViewer as SkinViewerInstance } from "skinview3d";
import type * as ThreeModule from "three";

export type SkinViewerModel = "default" | "slim" | "auto-detect";

/**
 * Which part of the model the camera settles on. "full" keeps the normal
 * head-to-toe framing; everything else dollies in on that body part, for
 * previewing a single piece layer (hair, a sleeve, etc) where the rest of
 * the model isn't the point.
 */
export type SkinViewerFocus =
  | "full"
  | "head"
  | "body"
  | "left-arm"
  | "right-arm"
  | "legs";

interface SkinViewer3DProps {
  /** A skin texture URL — an https:// URL or a data: URL both work. */
  src: string;
  model?: SkinViewerModel;
  focus?: SkinViewerFocus;
  width?: number;
  height?: number;
  className?: string;
  /** Whether drag-to-orbit/scroll-to-zoom respond to pointer input. */
  interactive?: boolean;
}

// How far the legs are splayed apart for the static display pose, in
// radians — a subtle "standing on a pedestal" stance rather than the
// default feet-together pose or a walking animation.
const LIMB_SPLAY = 0.35;

// How close the camera dollies in for each focus target, as a fraction of
// the default head-to-toe viewing distance.
const FOCUS_DISTANCE_FACTOR: Record<Exclude<SkinViewerFocus, "full">, number> = {
  head: 0.32,
  body: 0.5,
  "left-arm": 0.42,
  "right-arm": 0.42,
  legs: 0.48,
};

function applyFocus(
  viewer: SkinViewerInstance,
  three: typeof ThreeModule,
  focus: SkinViewerFocus,
) {
  if (focus === "full") {
    return;
  }

  const skin = viewer.playerObject.skin as unknown as Record<
    string,
    ThreeModule.Object3D
  >;

  let worldPos: ThreeModule.Vector3 | null = null;

  if (focus === "legs") {
    const left = new three.Vector3();
    const right = new three.Vector3();

    skin.leftLeg?.getWorldPosition(left);
    skin.rightLeg?.getWorldPosition(right);

    worldPos = left.add(right).multiplyScalar(0.5);
  } else {
    const partKey =
      focus === "left-arm"
        ? "leftArm"
        : focus === "right-arm"
          ? "rightArm"
          : focus;

    const part = skin[partKey];
    if (!part) {
      return;
    }

    worldPos = new three.Vector3();
    part.getWorldPosition(worldPos);
  }

  if (!worldPos) {
    return;
  }

  const direction = viewer.camera.position.clone().sub(viewer.controls.target);
  const baseDistance = direction.length();
  direction.normalize();

  viewer.controls.target.copy(worldPos);
  viewer.camera.position
    .copy(worldPos)
    .add(direction.multiplyScalar(baseDistance * FOCUS_DISTANCE_FACTOR[focus]));

  viewer.controls.update();
}

export function SkinViewer3D({
  src,
  model = "auto-detect",
  focus = "full",
  width = 260,
  height = 340,
  className,
  interactive = true,
}: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewerInstance | null>(null);

  // Set up the viewer once on mount.
  useEffect(() => {
    let cancelled = false;

    Promise.all([import("skinview3d"), import("three")]).then(
      ([{ SkinViewer }, three]) => {
        if (cancelled || !canvasRef.current) {
          return;
        }

        const viewer = new SkinViewer({
          canvas: canvasRef.current,
          width,
          height,
          zoom: 0.85,
        });

        // Static display pose — no walking animation, no auto-rotate.
        // Splay the legs apart a little so it reads as a deliberate
        // stance rather than the bare default rest pose.
        const { leftArm, rightArm, leftLeg, rightLeg } = viewer.playerObject.skin;
        leftArm.rotation.x = -LIMB_SPLAY;
        rightArm.rotation.x = LIMB_SPLAY;
        leftLeg.rotation.x = -LIMB_SPLAY;
        rightLeg.rotation.x = LIMB_SPLAY;

        // Keep zoom within a sane range relative to the default distance,
        // instead of letting it dolly in/out indefinitely.
        const defaultDistance = viewer.camera.position.distanceTo(
          viewer.controls.target,
        );
        viewer.controls.minDistance = defaultDistance * 0.6;
        viewer.controls.maxDistance = defaultDistance * 2;
        viewer.controls.enabled = interactive;
        viewer.controls.enableZoom = false;

        applyFocus(viewer, three, focus);

        // A faint checkered ground plane under the feet, for a sense of
        // "standing on something" without any actual walking.

        viewerRef.current = viewer;

        viewer.loadSkin(src, { model }).catch(() => {
          // Not a valid skin texture — leave the viewer showing nothing
          // rather than throwing.
        });
      },
    );

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload the texture whenever the source changes, without tearing down
  // the WebGL context (keeps the camera angle stable while remixing).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    viewer.loadSkin(src, { model }).catch(() => {});
  }, [src, model]);

  return (
    <div style={{ width, height, overflow: "hidden" }} className={className}>
      <canvas ref={canvasRef} style={{ filter: "drop-shadow(-6px 10px 6px rgba(0, 0, 0, 0.4))", imageRendering: "auto" }} />
    </div>
  );
}
