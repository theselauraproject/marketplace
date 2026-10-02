"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

import { toggleProjectLike } from "@/lib/projects-api";

interface LikeButtonProps {
  slug: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ slug, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;

    setError(null);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((current) => current + (nextLiked ? 1 : -1));
    setBusy(true);

    try {
      const result = await toggleProjectLike(slug);
      setLiked(result.liked);
      setCount(result.likesCount);
    } catch {
      setLiked(!nextLiked);
      setCount((current) => current - (nextLiked ? 1 : -1));
      setError("Sign in to like projects.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={liked}
        className={[
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
          liked
            ? "bg-[var(--danger-bg)] text-[var(--danger)]"
            : "bg-[var(--surface)] text-[var(--foreground)]/60 hover:text-[var(--foreground)]",
        ].join(" ")}
      >
        <Heart size={15} fill={liked ? "currentColor" : "none"} />
        {count.toLocaleString()}
      </button>

      {error && <p className="text-xs text-[var(--foreground)]/40">{error}</p>}
    </div>
  );
}
