"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkinViewer3D } from "@/components/skins/SkinViewer3D";
import { compositePieceOverNeutralBase, loadImage } from "@/lib/skin-compositor";
import { getFocusForSlot } from "@/components/skins/SkinThumbnail";
import {
  SKIN_SLOTS,
  uploadSkin,
  type SkinKind,
  type SkinSlot,
  type SkinVariant,
} from "@/lib/skins-api";

const inputClass = [
  "w-full",
  "rounded-xl",
  "border border-[var(--border)]",
  "bg-[var(--background)]",
  "px-3.5 py-2.5",
  "text-sm",
  "text-[var(--foreground)]",
  "outline-none",
  "transition",
  "placeholder:text-[var(--faint)]",
  "focus:border-[var(--foreground)]/30",
  "focus:ring-2",
  "focus:ring-[var(--foreground)]/5",
].join(" ");

export default function UploadSkinPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<SkinKind>("full");
  const [slot, setSlot] = useState<SkinSlot>("hair");
  const [variant, setVariant] = useState<SkinVariant>("classic");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Pieces are authored with everything but their one part transparent, so
  // preview them over a plain skin-toned body instead of the raw (mostly
  // invisible) layer.
  const [compositedPreviewUrl, setCompositedPreviewUrl] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!previewUrl || kind !== "piece") {
      setCompositedPreviewUrl(null);
      return;
    }

    let cancelled = false;

    compositePieceOverNeutralBase(previewUrl)
      .then((url) => {
        if (!cancelled) {
          setCompositedPreviewUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompositedPreviewUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [previewUrl, kind]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.type !== "image/png") {
      setError("Skin files must be a PNG image");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(selected);

    loadImage(objectUrl)
      .then((img) => {
        const validSize =
          (img.naturalWidth === 64 && img.naturalHeight === 64) ||
          (img.naturalWidth === 64 && img.naturalHeight === 32);

        if (!validSize) {
          setError(
            `That's a ${img.naturalWidth}x${img.naturalHeight} image — Minecraft skins must be 64x64 (or the legacy 64x32)`,
          );
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        setError(null);
        setFile(selected);
      })
      .catch(() => {
        setError("Couldn't read that image");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      })
      .finally(() => URL.revokeObjectURL(objectUrl));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setError("Choose a PNG skin file first");
      return;
    }

    if (!name.trim()) {
      setError("Give your skin a name");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const skin = await uploadSkin({
        name,
        description,
        kind,
        pieceSlot: kind === "piece" ? slot : undefined,
        variant,
        tags,
        file,
        fileName: file.name,
      });

      router.push(`/skins/${skin.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload skin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Upload a skin
      </h1>

      <p className="mb-8 text-sm text-[var(--foreground)]/55">
        Share a full skin, or just a piece — hair, a jacket, shoes, whatever —
        for other people to remix in the{" "}
        <a href="/skins/builder" className="underline underline-offset-2">
          builder
        </a>
        .
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Skin file (PNG)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              onChange={handleFileChange}
              className="block w-full text-sm text-[var(--foreground)]/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface)] file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-[var(--foreground)] hover:file:bg-[var(--surface-hover)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Name</label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Cozy sweater jacket"
              maxLength={60}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What's the vibe? Any credits or notes."
              className={[inputClass, "resize-y"].join(" ")}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">What is this?</p>

            <div className="flex gap-2">
              <KindOption
                active={kind === "full"}
                onClick={() => setKind("full")}
              >
                Full skin
              </KindOption>

              <KindOption
                active={kind === "piece"}
                onClick={() => setKind("piece")}
              >
                Piece
              </KindOption>
            </div>
          </div>

          {kind === "piece" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Which part?
              </label>

              <select
                value={slot}
                onChange={(event) => setSlot(event.target.value as SkinSlot)}
                className={inputClass}
              >
                {SKIN_SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Arm model
            </label>

            <div className="flex gap-2">
              <KindOption
                active={variant === "classic"}
                onClick={() => setVariant("classic")}
              >
                Classic
              </KindOption>

              <KindOption
                active={variant === "slim"}
                onClick={() => setVariant("slim")}
              >
                Slim
              </KindOption>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Tags (comma separated)
            </label>

            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="cozy, autumn, streetwear"
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            icon={<Upload size={15} />}
          >
            {submitting ? "Uploading…" : "Upload skin"}
          </Button>
        </div>

        <div>
          <Card className="sticky top-24 flex flex-col items-center gap-3 p-4">
            <p className="self-start text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
              Preview
            </p>

            {previewUrl ? (
              <SkinViewer3D
                src={
                  kind === "piece"
                    ? (compositedPreviewUrl ?? previewUrl)
                    : previewUrl
                }
                model={variant === "slim" ? "slim" : "default"}
                focus={kind === "piece" ? getFocusForSlot(slot) : "full"}
                width={220}
                height={280}
              />
            ) : (
              <div className="flex h-[280px] w-[220px] items-center justify-center rounded-lg bg-[var(--background)] text-center text-xs text-[var(--foreground)]/35">
                Choose a PNG to preview it in 3D
              </div>
            )}
          </Card>
        </div>
      </form>
    </main>
  );
}

function KindOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg border px-3.5 py-2 text-sm font-medium transition",
        active
          ? "border-[var(--foreground)]/20 bg-[var(--surface-hover)] text-[var(--foreground)]"
          : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--foreground)]/20 hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
