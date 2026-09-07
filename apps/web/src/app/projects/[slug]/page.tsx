import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Download } from "lucide-react";

import type { Project } from "@selaura/types";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { getProjectBySlug } from "@/lib/projects-api";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const data = await getProjectBySlug(slug, cookieHeader);

  if (!data) {
    notFound();
  }

  const { project, versions } = data;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
      <Link
        href="/library"
        className={[
          "mb-6 inline-flex items-center gap-1.5",
          "text-sm font-medium",
          "text-[var(--foreground)]/50",
          "transition",
          "hover:text-[var(--foreground)]",
        ].join(" ")}
      >
        <ArrowLeft size={15} />
        Back to browse
      </Link>

      {project.moderationNote && (
        <div
          className={[
            "mb-6 flex items-start gap-3",
            "rounded-xl",
            "border border-amber-500/30",
            "bg-amber-500/5",
            "px-4 py-3",
          ].join(" ")}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />

          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-500">
              {project.status === "hidden"
                ? "This project is hidden"
                : project.status === "rejected"
                  ? "This project was rejected"
                  : "Moderator note"}
            </p>

            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              {project.moderationNote}
            </p>
          </div>
        </div>
      )}

      <div
        className={[
          "grid gap-6",
          "lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]",
        ].join(" ")}
      >
        {}

        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden p-0">
            <ProjectThumbnail project={project} />

            <div className="px-6 pb-6 pt-12">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {project.name}
                </h1>

                <ProjectTypeBadge type={project.type} />
              </div>

              <p className="mt-1 text-sm text-[var(--muted)]">
                by {project.author.username}
              </p>

              <p
                className={[
                  "mt-6 max-w-2xl",
                  "text-sm leading-6",
                  "text-[var(--foreground)]/70",
                ].join(" ")}
              >
                {project.description}
              </p>

              {project.tags && project.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className={[
                        "rounded-full",
                        "bg-[var(--surface)]",
                        "px-2.5 py-1",
                        "text-xs font-medium",
                        "text-[var(--muted)]",
                      ].join(" ")}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {project.readme?.trim() && (
                <section className="pt-8">
                  <MarkdownRenderer>{project.readme}</MarkdownRenderer>
                </section>
              )}
            </div>
          </Card>

          {}

          <Card className="p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold">Versions</h2>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Download releases of {project.name}.
              </p>
            </div>

            {versions.length === 0 ? (
              <div
                className={[
                  "rounded-xl",
                  "border border-dashed",
                  "border-[var(--border)]",
                  "px-5 py-10",
                  "text-center",
                ].join(" ")}
              >
                <p className="text-sm font-medium">No versions yet</p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  This project does not have any published versions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <VersionRow key={version.id} version={version} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {}

        <aside>
          <Card className="h-fit p-5">
            {versions.length > 0 ? (
              <a href={versions[0].downloadUrl} download className="block">
                <Button
                  variant="default"
                  className="w-full"
                  icon={<Download size={16} />}
                >
                  Download
                </Button>
              </a>
            ) : (
              <Button
                variant="default"
                className="w-full"
                icon={<Download size={16} />}
                disabled
              >
                No versions available
              </Button>
            )}

            <AuthorRow author={project.author} />

            <div className="mt-5 space-y-4">
              <StatRow
                label="Downloads"
                value={(project.downloads ?? 0).toLocaleString()}
              />

              {project.createdAt && (
                <StatRow
                  label="Made on"
                  value={formatDate(project.createdAt)}
                />
              )}

              {project.updatedAt && (
                <StatRow
                  label="Updated"
                  value={formatDate(project.updatedAt)}
                />
              )}
            </div>

            {project.gameVersions && project.gameVersions.length > 0 && (
              <ChipSection
                title="Game versions"
                values={project.gameVersions}
              />
            )}

            {project.loaders && project.loaders.length > 0 && (
              <ChipSection
                title="Loaders"
                values={project.loaders.map(formatLabel)}
              />
            )}

            {project.environments && project.environments.length > 0 && (
              <ChipSection
                title="Environment"
                values={project.environments.map(formatLabel)}
              />
            )}

            {project.resolutions && project.resolutions.length > 0 && (
              <ChipSection title="Resolutions" values={project.resolutions} />
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}

function VersionRow({
  version,
}: {
  version: {
    id: string;
    version: string;
    changelog: string | null;
    gameVersions: string[];
    loaders: string[] | null;
    environments: string[] | null;
    resolutions: string[] | null;
    fileName: string;
    fileSize: number;
    downloads: number;
    downloadUrl: string;
    createdAt: string;
  };
}) {
  return (
    <div className={["rounded-xl", "bg-[var(--surface)]", "p-4"].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{version.version}</h3>

            <span className="text-xs text-[var(--foreground)]/35">
              {formatDate(version.createdAt)}
            </span>
          </div>

          <p className="mt-1 text-xs text-[var(--muted)]">
            {version.fileName}
            {" · "}
            {formatFileSize(version.fileSize)}
            {" · "}
            {version.downloads.toLocaleString()} downloads
          </p>
        </div>

        <a href={version.downloadUrl}>
          <Button
            variant="default"
            className="w-full"
            icon={<Download size={16} />}
          >
            Download
          </Button>
        </a>
      </div>

      {version.changelog && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--foreground)]/60">
            {version.changelog}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {version.gameVersions.map((gameVersion) => (
          <Chip key={`version-${gameVersion}`} value={gameVersion} />
        ))}

        {version.loaders?.map((loader) => (
          <Chip key={`loader-${loader}`} value={formatLabel(loader)} />
        ))}

        {version.environments?.map((environment) => (
          <Chip
            key={`environment-${environment}`}
            value={formatLabel(environment)}
          />
        ))}

        {version.resolutions?.map((resolution) => (
          <Chip key={`resolution-${resolution}`} value={resolution} />
        ))}
      </div>
    </div>
  );
}

function Chip({ value }: { value: string }) {
  return (
    <span
      className={[
        "rounded-md",
        "bg-[var(--surface-hover)]",
        "px-2 py-1",
        "text-[11px] font-medium",
        "text-[var(--foreground)]/60",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function ProjectThumbnail({ project }: { project: Project }) {
  return (
    <div className="relative">
      <div
        className={[
          "aspect-[3/1] w-full",
          "overflow-hidden",
          "bg-[var(--surface)]",
        ].join(" ")}
      >
        {project.headerUrl ? (
          <img
            src={project.headerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={[
              "flex h-full items-center justify-center",
              "text-6xl font-semibold",
              "text-[var(--faint)]",
            ].join(" ")}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div
        className={[
          "absolute -bottom-8 left-6",
          "h-20 w-20",
          "overflow-hidden rounded-2xl",
          "border-4 border-[var(--background)]",
          "bg-[var(--surface)]",
          "shadow-[0_8px_20px_var(--shadow)]",
        ].join(" ")}
      >
        {project.iconUrl ? (
          <img
            src={project.iconUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={[
              "flex h-full items-center justify-center",
              "text-2xl font-semibold",
              "text-[var(--faint)]",
            ].join(" ")}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function AuthorRow({ author }: { author: Project["author"] }) {
  return (
    <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
      <div
        className={[
          "h-9 w-9 shrink-0",
          "overflow-hidden rounded-full",
          "bg-[var(--surface)]",
        ].join(" ")}
      >
        {author.avatarUrl ? (
          <img
            src={author.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={[
              "flex h-full items-center justify-center",
              "text-sm font-semibold",
              "text-[var(--faint)]",
            ].join(" ")}
          >
            {author.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">Author</p>

        <p className="truncate text-sm font-medium text-[var(--foreground)]">
          {author.username}
        </p>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>

      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function ChipSection({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className={[
              "rounded-lg",
              "bg-[var(--surface)]",
              "px-2.5 py-1",
              "text-xs font-medium",
              "text-[var(--foreground)]/70",
            ].join(" ")}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatLabel(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
