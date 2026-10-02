"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Star, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { useCurrentUser } from "@/lib/use-current-user";
import { deleteSkin, setFeaturedSkin } from "@/lib/skins-api";

export function SkinActions({
  skinId,
  slug,
  authorId,
}: {
  skinId: string;
  slug: string;
  authorId: string;
}) {
  const router = useRouter();
  const { user } = useCurrentUser();

  const [busy, setBusy] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const isOwner = user.id === authorId;
  const isStaff = user.role === "admin" || user.role === "moderator";

  if (!isOwner && !isStaff) {
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
      await setFeaturedSkin(skinId);
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
        {isOwner && (
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

        <Button
          type="button"
          variant="muted"
          icon={<Trash2 size={14} />}
          disabled={busy}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
