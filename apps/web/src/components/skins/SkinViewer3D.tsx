"use client";

import { useEffect, useRef } from "react";
import type { SkinViewer as SkinViewerInstance } from "skinview3d";
import type * as ThreeModule from "three";

import { toDataUrl } from "@/lib/skin-image";

export type SkinViewerModel = "default" | "slim" | "auto-detect";

export type SkinViewerFocus =
  | "full"
  | "head"
  | "body"
  | "left-arm"
  | "right-arm"
  | "legs";

interface SkinViewer3DProps {
  src: string;
  model?: SkinViewerModel;
  focus?: SkinViewerFocus;
  width?: number;
  height?: number;
  className?: string;
  interactive?: boolean;
}

const LIMB_SPLAY = 0.35;

const FOCUS_DISTANCE_FACTOR: Record<Exclude<SkinViewerFocus, "full">, number> = {
  head: 0.5,
  body: 0.5,
  "left-arm": 0.42,
  "right-arm": 0.42,
  legs: 0.48,
};

const HEAD_FOCUS_YAW = Math.PI / 4;

interface HomeCamera {
  position: ThreeModule.Vector3;
  target: ThreeModule.Vector3;
}

function applyFocus(
  viewer: SkinViewerInstance,
  three: typeof ThreeModule,
  focus: SkinViewerFocus,
  home: HomeCamera,
) {
  viewer.controls.minDistance = 0;
  viewer.controls.maxDistance = Infinity;
  viewer.controls.target.copy(home.target);
  viewer.camera.position.copy(home.position);
  viewer.controls.update();

  const skin = viewer.playerObject.skin as unknown as Record<
    string,
    ThreeModule.Object3D
  >;

  const allParts = ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"];

  if (focus === "full") {
    for (const key of allParts) {
      const part = skin[key];
      if (part) part.visible = true;
    }
    skin.head?.rotation.set(0, 0, 0);
    setDistanceLimits(viewer);
    return;
  }

  const partsToShow: string[] =
    focus === "legs"
      ? ["leftLeg", "rightLeg"]
      : focus === "left-arm"
        ? ["leftArm"]
        : focus === "right-arm"
          ? ["rightArm"]
          : focus === "body"
            ? ["body"]
            : ["head"];

  for (const key of allParts) {
    const part = skin[key];
    if (part) part.visible = partsToShow.includes(key);
  }

  skin.head?.rotation.set(0, focus === "head" ? HEAD_FOCUS_YAW : 0, 0);

  viewer.playerObject.updateMatrixWorld(true);

  const box = new three.Box3();
  for (const key of partsToShow) {
    const part = skin[key];
    if (part) box.expandByObject(part);
  }

  if (box.isEmpty()) {
    setDistanceLimits(viewer);
    return;
  }

  const center = box.getCenter(new three.Vector3());

  const baseDistance = home.position.distanceTo(home.target);

  const direction =
    focus === "head"
      ? new three.Vector3(0, 0.08, 1).normalize()
      : home.position.clone().sub(home.target).normalize();

  viewer.controls.target.copy(center);
  viewer.camera.position
    .copy(center)
    .add(direction.multiplyScalar(baseDistance * FOCUS_DISTANCE_FACTOR[focus]));

  viewer.controls.update();
  setDistanceLimits(viewer);
}

function setDistanceLimits(viewer: SkinViewerInstance) {
  const restingDistance = viewer.camera.position.distanceTo(
    viewer.controls.target,
  );

  viewer.controls.minDistance = restingDistance * 0.6;
  viewer.controls.maxDistance = restingDistance * 2;
}

async function applyTexture(
  viewer: SkinViewerInstance,
  src: string,
  model: SkinViewerModel,
  isStale: () => boolean,
) {
  try {
    const url = await toDataUrl(src);

    if (isStale()) {
      return;
    }

    await viewer.loadSkin(url, { model });
  } catch {
  }
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
  const threeRef = useRef<typeof ThreeModule | null>(null);
  const homeRef = useRef<HomeCamera | null>(null);
  const textureRequestRef = useRef(0);

  const latestRef = useRef({ src, model, focus, interactive, width, height });

  useEffect(() => {
    latestRef.current = { src, model, focus, interactive, width, height };
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([import("skinview3d"), import("three")]).then(
      ([{ SkinViewer }, three]) => {
        if (cancelled || !canvasRef.current) {
          return;
        }

        const initial = latestRef.current;

        const viewer = new SkinViewer({
          canvas: canvasRef.current,
          width: initial.width,
          height: initial.height,
          zoom: 0.85,
        });

        const { leftArm, rightArm, leftLeg, rightLeg } = viewer.playerObject.skin;
        leftArm.rotation.x = -LIMB_SPLAY;
        rightArm.rotation.x = LIMB_SPLAY;
        leftLeg.rotation.x = -LIMB_SPLAY;
        rightLeg.rotation.x = LIMB_SPLAY;

        threeRef.current = three;
        homeRef.current = {
          position: viewer.camera.position.clone(),
          target: viewer.controls.target.clone(),
        };

        applyFocus(viewer, three, initial.focus, homeRef.current);

        viewer.controls.enabled = initial.interactive;
        viewer.controls.enableZoom = false;

        viewerRef.current = viewer;

        const requestId = ++textureRequestRef.current;

        applyTexture(
          viewer,
          initial.src,
          initial.model,
          () => textureRequestRef.current !== requestId,
        );
      },
    );

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setSize(width, height);
  }, [width, height]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const three = threeRef.current;
    const home = homeRef.current;

    if (!viewer || !three || !home) {
      return;
    }

    applyFocus(viewer, three, focus, home);
  }, [focus]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const requestId = ++textureRequestRef.current;

    applyTexture(
      viewer,
      src,
      model,
      () => textureRequestRef.current !== requestId,
    );
  }, [src, model]);

  return (
    <div style={{ width, height, overflow: "hidden" }} className={className}>
      <canvas ref={canvasRef} style={{ filter: "drop-shadow(-6px 10px 6px rgba(0, 0, 0, 0.4))", imageRendering: "auto" }} />
    </div>
  );
}
