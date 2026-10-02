import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { SkinViewer3D } from "@/components/skins/SkinViewer3D";
import { SkinActions } from "@/components/skins/SkinActions";
import { getSkinBySlug, SKIN_SLOTS } from "@/lib/skins-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const skin = await getSkinBySlug(slug);

  if (!skin) {
    return { title: "Skin not found — Selaura Marketplace" };
  }

  return {
    title: `${skin.name} — Selaura Marketplace`,
    description: skin.description || `A skin by ${skin.author.username}.`,
  };
}

export default async function SkinDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const skin = await getSkinBySlug(slug);

  if (!skin) {
    notFound();
  }

  const slotLabel = SKIN_SLOTS.find((s) => s.value === skin.pieceSlot)?.label;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div>
          <Card className="flex flex-col items-center gap-3 p-4">
            <SkinViewer3D
              src={skin.imageUrl}
              model={skin.variant === "slim" ? "slim" : "default"}
              width={252}
              height={320}
            />
          </Card>

          <Button
            href={skin.imageUrl}
            target="_blank"
            variant="muted"
            icon={<Download size={14} />}
            className="mt-3 w-full"
          >
            Download texture
          </Button>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {skin.name}
            </h1>

            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/50">
              {skin.kind === "piece" ? slotLabel ?? "Piece" : "Full skin"}
            </span>
          </div>

          <Link
            href={`/u/${skin.author.username}`}
            className="mt-1 inline-block text-sm text-[var(--foreground)]/50 transition hover:text-[var(--foreground)]"
          >
            by {skin.author.username}
          </Link>

          {skin.description && (
            <p className="mt-4 text-sm leading-6 text-[var(--foreground)]/70">
              {skin.description}
            </p>
          )}

          {skin.tags && skin.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {skin.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {skin.remixedFrom.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
                Built from
              </p>

              <div className="flex flex-wrap gap-2">
                {skin.remixedFrom.map((credit) => (
                  <Link
                    key={credit.id}
                    href={`/skins/${credit.slug}`}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs transition hover:border-[var(--foreground)]/20"
                  >
                    <img
                      src={credit.imageUrl}
                      alt=""
                      style={{ imageRendering: "pixelated" }}
                      className="h-6 w-6 rounded bg-[var(--surface)] object-contain"
                    />
                    <span className="font-medium">{credit.name}</span>
                    <span className="text-[var(--foreground)]/35">
                      by {credit.author.username}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <SkinActions
              skinId={skin.id}
              slug={skin.slug}
              authorId={skin.author.id}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
