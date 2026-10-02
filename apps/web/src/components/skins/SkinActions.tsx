"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Star, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { deleteSkin, setFeaturedSkin } from "@/lib/skins-api";

export function SkinActions({
  skinId,
  slug,
  canManage,
  canFeature,
  uploaderUsername,
}: {
  skinId: string;
  slug: string;
  canManage: boolean;
  canFeature: boolean;
  uploaderUsername?: string;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage && !canFeature) {
    return null;
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this skin? This can't be undone.",
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteSkin(slug);
      router.push("/skins");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that skin");
      setBusy(false);
    }
  }

  async function handleFeature() {
    setBusy(true);
    setError(null);

    try {
      await setFeaturedSkin(skinId, uploaderUsername);
      setFeatured(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't feature that skin",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        {canFeature && uploaderUsername && (
          <Button
            type="button"
            variant="muted"
            icon={featured ? <Check size={14} /> : <Star size={14} />}
            disabled={busy || featured}
            onClick={handleFeature}
          >
            {featured ? "Featured" : "Feature on profile"}
          </Button>
        )}

        {canManage && (
          <Button
            type="button"
            variant="muted"
            icon={<Trash2 size={14} />}
            disabled={busy}
            onClick={handleDelete}
          >
            Delete
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
