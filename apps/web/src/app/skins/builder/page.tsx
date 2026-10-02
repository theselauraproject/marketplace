"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Wand2, X } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkinViewer3D } from "@/components/skins/SkinViewer3D";
import { SkinSearchInput } from "@/components/skins/SkinSearchInput";
import { SkinThumbnail } from "@/components/skins/SkinThumbnail";
import {
  getSkins,
  uploadSkin,
  SKIN_SLOTS,
  type Skin,
  type SkinSlot,
} from "@/lib/skins-api";
import { compositeSkinLayers, canvasToPngBlob } from "@/lib/skin-compositor";
import { inputClass } from "@/components/ui/fields";

const SLOT_ORDER: SkinSlot[] = [
  "legs",
  "shoes",
  "top",
  "jacket",
  "sleeve_left",
  "sleeve_right",
  "accessory",
  "headwear",
  "hair",
  "face",
  "other",
];

export default function SkinBuilderPage() {
  const router = useRouter();

  const [library, setLibrary] = useState<Skin[] | null>(null);
  const [known, setKnown] = useState<Record<string, Skin>>({});
  const [search, setSearch] = useState("");
  const [baseId, setBaseId] = useState<string | null>(null);
  const [pieceBySlot, setPieceBySlot] = useState<
    Partial<Record<SkinSlot, string>>
  >({});
  const [activeTab, setActiveTab] = useState<SkinSlot>("hair");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const term = search.trim();

    const timer = setTimeout(
      () => {
        getSkins({ q: term || undefined })
          .then((result) => {
            if (cancelled) return;

            setLibrary(result);
            setKnown((current) => ({
              ...current,
              ...Object.fromEntries(result.map((skin) => [skin.id, skin])),
            }));
          })
          .catch(() => {
            if (!cancelled) setLibrary([]);
          });
      },
      term ? 200 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const bases = useMemo(
    () => library?.filter((s) => s.kind === "full") ?? [],
    [library],
  );

  const piecesBySlot = useMemo(() => {
    const map = new Map<SkinSlot, Skin[]>();

    for (const skin of library ?? []) {
      if (skin.kind !== "piece" || !skin.pieceSlot) continue;
      const list = map.get(skin.pieceSlot) ?? [];
      list.push(skin);
      map.set(skin.pieceSlot, list);
    }

    return map;
  }, [library]);

  const base = baseId ? (known[baseId] ?? null) : null;

  const selectedPieces = SLOT_ORDER.map((slot) => {
    const id = pieceBySlot[slot];
    return id ? (known[id] ?? null) : null;
  }).filter((s): s is Skin => s !== null);

  const layerKey = JSON.stringify([
    ...(base ? [base.imageUrl] : []),
    ...selectedPieces.map((piece) => piece.imageUrl),
  ]);

  useEffect(() => {
    const layerUrls: string[] = JSON.parse(layerKey);

    if (layerUrls.length === 0) {
      setPreviewUrl(null);
      setPreviewCanvas(null);
      return;
    }

    let cancelled = false;

    compositeSkinLayers(layerUrls)
      .then((canvas) => {
        if (cancelled) return;
        setPreviewCanvas(canvas);
        setPreviewUrl(canvas.toDataURL("image/png"));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't combine those textures");
      });

    return () => {
      cancelled = true;
    };
  }, [layerKey]);

  function togglePiece(slot: SkinSlot, skinId: string) {
    setPieceBySlot((current) => {
      const next = { ...current };
      if (next[slot] === skinId) {
        delete next[slot];
      } else {
        next[slot] = skinId;
      }
      return next;
    });
  }

  async function handleSave() {
    if (!previewCanvas) {
      setError("Pick a base skin or at least one piece first");
      return;
    }

    if (!name.trim()) {
      setError("Give your creation a name");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const blob = await canvasToPngBlob(previewCanvas);

      const remixedFrom = [
        ...(base ? [base.id] : []),
        ...selectedPieces.map((p) => p.id),
      ];

      const skin = await uploadSkin({
        name,
        description,
        kind: "full",
        file: blob,
        fileName: "composite.png",
        remixedFrom,
      });

      router.push(`/skins/${skin.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skin");
    } finally {
      setSaving(false);
    }
  }

  const searching = search.trim().length > 0;

  const visibleTab: SkinSlot =
    searching && (piecesBySlot.get(activeTab)?.length ?? 0) === 0
      ? (SLOT_ORDER.find((slot) => (piecesBySlot.get(slot)?.length ?? 0) > 0) ??
        activeTab)
      : activeTab;

  const activePieces = piecesBySlot.get(visibleTab) ?? [];

  const headCompanionSlot: SkinSlot | null =
    visibleTab === "hair"
      ? "headwear"
      : visibleTab === "headwear"
        ? "hair"
        : null;

  const headCompanionUrl = headCompanionSlot
    ? (known[pieceBySlot[headCompanionSlot] ?? ""]?.imageUrl ?? null)
    : null;

  const companionGoesBefore = visibleTab === "hair";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center gap-2">
        <Wand2 size={20} />
        <h1 className="text-2xl font-semibold tracking-tight">Skin builder</h1>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-[var(--foreground)]/55">
        Start from a base skin (optional), then layer on pieces from the
        community library. Everything you use gets credited automatically.
      </p>

      <SkinSearchInput
        value={search}
        onChange={setSearch}
        className="mb-8 max-w-sm"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div>
            <p className="mb-2 text-sm font-medium">Base skin</p>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBaseId(null)}
                className={[
                  "rounded-lg border px-3 py-2 text-xs font-medium transition",
                  baseId === null
                    ? "border-[var(--foreground)]/20 bg-[var(--surface-hover)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]/20",
                ].join(" ")}
              >
                Blank
              </button>

              {library === null && (
                <span className="self-center text-xs text-[var(--foreground)]/40">
                  Loading…
                </span>
              )}

              {library !== null && searching && bases.length === 0 && (
                <span className="self-center text-xs text-[var(--foreground)]/40">
                  No base skins match.
                </span>
              )}

              {bases.map((skin) => (
                <ThumbButton
                  key={skin.id}
                  skin={skin}
                  active={baseId === skin.id}
                  onClick={() => setBaseId(skin.id === baseId ? null : skin.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Pieces</p>

            <div className="mb-3 flex flex-wrap gap-1">
              {SLOT_ORDER.map((slot) => {
                const label = SKIN_SLOTS.find((s) => s.value === slot)?.label;
                const count = (piecesBySlot.get(slot) ?? []).length;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setActiveTab(slot)}
                    className={[
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                      visibleTab === slot
                        ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
                      pieceBySlot[slot] ? "ring-1 ring-[var(--foreground)]/20" : "",
                    ].join(" ")}
                  >
                    {label} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {activePieces.length === 0 ? (
              <Card className="p-6 text-center text-sm text-[var(--foreground)]/45">
                {searching
                  ? "No pieces match that search."
                  : "No pieces uploaded for this slot yet."}
              </Card>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activePieces.map((skin) => (
                  <ThumbButton
                    key={skin.id}
                    skin={skin}
                    active={pieceBySlot[visibleTab] === skin.id}
                    onClick={() => togglePiece(visibleTab, skin.id)}
                    companionImageUrl={headCompanionUrl ?? undefined}
                    companionGoesBefore={companionGoesBefore}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="flex flex-col items-center gap-3 p-4 lg:sticky lg:top-24 lg:z-10">
            {previewUrl ? (
              <SkinViewer3D src={previewUrl} width={252} height={320} />
            ) : (
              <div className="flex h-[320px] w-[252px] items-center justify-center text-center text-xs text-[var(--foreground)]/35">
                Pick a base or a piece to start
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name your creation"
              maxLength={60}
              className={inputClass}
            />

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
              rows={2}
              maxLength={500}
              className={[inputClass, "resize-y"].join(" ")}
            />

            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

            <Button
              type="button"
              className="w-full"
              disabled={saving || !previewCanvas}
              icon={<Save size={14} />}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save as new skin"}
            </Button>
          </Card>
        </div>
      </div>
    </main>
  );
}

function ThumbButton({
  skin,
  active,
  onClick,
  companionImageUrl,
  companionGoesBefore,
}: {
  skin: Skin;
  active: boolean;
  onClick: () => void;
  companionImageUrl?: string;
  companionGoesBefore?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${skin.name} by ${skin.author.username}`}
      className={[
        "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border p-1 transition",
        active
          ? "border-[var(--foreground)]/40 bg-[var(--surface-hover)]"
          : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--foreground)]/20",
      ].join(" ")}
    >
      <SkinThumbnail
        imageUrl={skin.imageUrl}
        name={skin.name}
        variant={skin.variant}
        kind={skin.kind}
        pieceSlot={skin.pieceSlot}
        layersBefore={
          companionImageUrl && companionGoesBefore ? [companionImageUrl] : undefined
        }
        layersAfter={
          companionImageUrl && !companionGoesBefore ? [companionImageUrl] : undefined
        }
        width={56}
        height={72}
      />

      {active && (
        <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)]">
          <X size={9} />
        </span>
      )}
    </button>
  );
}
