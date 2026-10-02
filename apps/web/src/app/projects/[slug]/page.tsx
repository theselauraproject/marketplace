import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ShieldAlert, User } from "lucide-react";

import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { ProjectOwnerActions } from "@/components/projects/ProjectOwnerActions";
import { VersionsList } from "@/components/projects/VersionsList";
import { LikeButton } from "@/components/projects/LikeButton";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Card } from "@/components/ui/Card";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { getProjectBySlug } from "@/lib/projects-api";
import { getCookieHeader } from "@/lib/server-cookies";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadProject(slug: string) {
  const cookieHeader = await getCookieHeader();

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
            <div className="-mt-8 mb-5 inline-flex max-w-full items-end gap-4 rounded-2xl">
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
                      ? `/org/${project.author.username}`
                      : `/u/${project.author.username}`
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground)]/50 transition hover:text-[var(--foreground)]"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-hover)]">
                    {project.author.avatarUrl ? (
                      <img
                        src={project.author.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={10} className="text-[var(--faint)]" />
                    )}
                  </span>
                  by {project.author.username}
                </Link>
              </div>
            </div>

            <p className="mb-4 text-sm leading-6 text-[var(--foreground)]/70">
              {project.description}
            </p>

            <div className="flex gap-2 mb-6">
              {project.canManage && (
                <ProjectOwnerActions slug={project.slug} name={project.name} />
              )}
                <LikeButton
                  slug={project.slug}
                  initialLiked={project.likedByMe ?? false}
                  initialCount={project.likesCount ?? 0}
                />
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
                <DownloadButton
                  url={latest.downloadUrl}
                  className="w-full"
                  icon={<Download size={15} />}
                >
                  Download {latest.version}
                </DownloadButton>

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

              <VersionsList versions={versions} />
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

            {(project.createdAt || project.updatedAt) && (
              <Card className="space-y-1.5 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
                  Details
                </p>

                {project.createdAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--foreground)]/40">Created</span>
                    <span className="text-[var(--foreground)]/70">
                      {new Date(project.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {project.updatedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--foreground)]/40">
                      Last updated
                    </span>
                    <span className="text-[var(--foreground)]/70">
                      {new Date(project.updatedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
