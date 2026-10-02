import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ShieldAlert } from "lucide-react";

import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getProjectBySlug } from "@/lib/projects-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadProject(slug: string) {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return getProjectBySlug(slug, cookieHeader);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadProject(slug);

  if (!detail) {
    return { title: "Project not found — Selaura Marketplace" };
  }

  return {
    title: `${detail.project.name} — Selaura Marketplace`,
    description: detail.project.description,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await loadProject(slug);

  if (!detail) {
    notFound();
  }

  const { project, versions } = detail;
  const latest = versions[0];

  return (
    <main className="w-full">
      <div className="relative h-48 w-full overflow-hidden bg-[var(--surface)] sm:h-64">
        {project.headerUrl ? (
          <img
            src={project.headerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
        <div className="relative grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="-mt-10 mb-5 flex items-end gap-4 sm:-mt-12">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--background)] bg-[var(--background)] shadow-md sm:h-24 sm:w-24">
                {project.iconUrl ? (
                  <img
                    src={project.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[var(--faint)]">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {project.name}
                  </h1>

                  <ProjectTypeBadge type={project.type} />
                </div>

                <Link
                  href={
                    project.author.kind === "org"
                      ? "#"
                      : `/u/${project.author.username}`
                  }
                  className="text-sm text-[var(--foreground)]/50 transition hover:text-[var(--foreground)]"
                >
                  by {project.author.username}
                </Link>
              </div>
            </div>

            {project.status && project.status !== "approved" && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium capitalize">{project.status}</p>
                  {project.moderationNote && (
                    <p className="mt-0.5 text-[var(--danger)]/80">
                      {project.moderationNote}
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="mb-6 text-sm leading-6 text-[var(--foreground)]/70">
              {project.description}
            </p>

            {project.tags && project.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {project.readme ? (
              <MarkdownRenderer>{project.readme}</MarkdownRenderer>
            ) : (
              <p className="text-sm text-[var(--foreground)]/40">
                This project doesn&apos;t have a description page yet.
              </p>
            )}
          </div>

          <div className="space-y-4 lg:pt-[4.5rem]">
            {latest && (
              <Card className="p-4">
                <Button
                  href={latest.downloadUrl}
                  className="w-full"
                  icon={<Download size={15} />}
                >
                  Download {latest.version}
                </Button>

                <p className="mt-2 text-center text-xs text-[var(--foreground)]/40">
                  {formatFileSize(latest.fileSize)} ·{" "}
                  {project.downloads.toLocaleString()} downloads
                </p>
              </Card>
            )}

            <Card className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
                Versions
              </p>

              <div className="space-y-1">
                {versions.map((version) => (
                  <a
                    key={version.id}
                    href={version.downloadUrl}
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition hover:bg-[var(--surface)]"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {version.version}
                    </span>

                    <span className="shrink-0 text-xs text-[var(--foreground)]/40">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </a>
                ))}
              </div>
            </Card>

            {latest?.gameVersions && latest.gameVersions.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
                  Game versions
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {latest.gameVersions.map((version) => (
                    <span
                      key={version}
                      className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted)]"
                    >
                      {version}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
