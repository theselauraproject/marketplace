"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Wand2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkinSearchInput } from "@/components/skins/SkinSearchInput";
import { SkinThumbnail } from "@/components/skins/SkinThumbnail";
import {
  getSkins,
  SKIN_SLOTS,
  type Skin,
  type SkinKind,
  type SkinSlot,
} from "@/lib/skins-api";

type KindFilter = "all" | SkinKind;
type SlotFilter = "all" | SkinSlot;

const KIND_OPTIONS: [KindFilter, string][] = [
  ["all", "All"],
  ["full", "Full skins"],
  ["piece", "Pieces"],
];

const SLOT_OPTIONS: [SlotFilter, string][] = [
  ["all", "Any piece"],
  ...SKIN_SLOTS.map((slot): [SlotFilter, string] => [slot.value, slot.label]),
];

function FilterChip({
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
        "rounded-lg px-3 py-2 text-xs font-medium transition",
        active
          ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
          : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function SkinsPage() {
  const [skins, setSkins] = useState<Skin[] | null>(null);
  const [kind, setKind] = useState<KindFilter>("all");
  const [slot, setSlot] = useState<SlotFilter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setError(null);

    const timer = setTimeout(() => {
      getSkins({
        kind: kind === "all" ? undefined : kind,
        slot: kind === "piece" && slot !== "all" ? slot : undefined,
        q: query.trim() || undefined,
      })
        .then((result) => {
          if (!cancelled) setSkins(result);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load skins right now.");
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, slot, query]);

  const slotLabels = useMemo(
    () => Object.fromEntries(SKIN_SLOTS.map((s) => [s.value, s.label])),
    [],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skins</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/55">
            Browse skins and skin pieces made by the community, or remix
            pieces together into something new.
          </p>
        </div>

        <div className="flex gap-2">
          <Button href="/skins/builder" variant="outline" icon={<Wand2 size={15} />}>
            Builder
          </Button>

          <Button href="/skins/upload" icon={<Plus size={15} />}>
            Upload
          </Button>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SkinSearchInput
            value={query}
            onChange={setQuery}
            className="max-w-xs"
          />

          <div className="flex gap-1.5">
            {KIND_OPTIONS.map(([value, label]) => (
              <FilterChip
                key={value}
                active={kind === value}
                onClick={() => setKind(value)}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>

        {kind === "piece" && (
          <div className="flex flex-wrap gap-1.5">
            {SLOT_OPTIONS.map(([value, label]) => (
              <FilterChip
                key={value}
                active={slot === value}
                onClick={() => setSlot(value)}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {skins === null && !error && (
        <p className="text-sm text-[var(--foreground)]/40">Loading…</p>
      )}

      {skins && skins.length === 0 && (
        <Card className="p-8 text-center text-sm text-[var(--foreground)]/50">
          {query.trim()
            ? "Nothing matches that search."
            : "No skins match yet — be the first to upload one."}
        </Card>
      )}

      {skins && skins.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {skins.map((skin) => (
            <Link key={skin.id} href={`/skins/${skin.slug}`}>
              <Card className="group overflow-hidden p-0 transition hover:border-[var(--foreground)]/20">
                <div className="bg-[var(--surface)]">
                  <SkinThumbnail
                    imageUrl={skin.imageUrl}
                    name={skin.name}
                    variant={skin.variant}
                    kind={skin.kind}
                    pieceSlot={skin.pieceSlot}
                  />
                </div>

                <div className="p-3">
                  <p className="truncate text-sm font-medium">{skin.name}</p>

                  <p className="mt-0.5 truncate text-xs text-[var(--foreground)]/40">
                    {skin.kind === "piece"
                      ? slotLabels[skin.pieceSlot ?? "other"]
                      : "Full skin"}{" "}
                    · by {skin.author.username}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
