import Link from "next/link";
import { Download } from "lucide-react";

import type { Project } from "@selaura/types";

import { Card } from "@/components/ui/Card";
import { ProjectTypeBadge } from "./ProjectTypeBadge";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.slug}`} className="group block h-full">
      {}
      <div
        className={[
          "h-full",
          "overflow-visible",
          "transition-transform",
          "duration-300 ease-out",
          "group-hover:-translate-y-1",
        ].join(" ")}
      >
        <Card
          className={[
            "h-full",
            "overflow-visible",
            "transition-[box-shadow]",
            "duration-300 ease-out",
            "group-hover:shadow-lg",
          ].join(" ")}
        >
          <div
            className={[
              "aspect-[2/1]",
              "relative",
              "overflow-hidden",
              "bg-[var(--surface)]",
              "rounded-t-xl",
            ].join(" ")}
          >
            {project.headerUrl ? (
              <img
                src={project.headerUrl ?? undefined}
                alt=""
                className={[
                  "h-full w-full",
                  "object-cover",
                  "transition-transform",
                  "duration-300 ease-out",
                  "group-hover:scale-[1.02]",
                ].join(" ")}
              />
            ) : (
              <div
                className={[
                  "flex h-full",
                  "items-center justify-center",
                  "text-3xl font-semibold",
                  "text-[var(--faint)]",
                ].join(" ")}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="relative flex flex-col px-3 pb-3 pt-8">
            {project.iconUrl && (
              <div className="absolute -top-6 left-3 h-12 w-12 overflow-hidden rounded-lg border-2 border-[var(--background)] bg-[var(--background)] shadow-md">
                <img
                  src={project.iconUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div
              className={[
                "flex h-6",
                "items-center",
                "justify-between",
                "gap-2",
              ].join(" ")}
            >
              <h3
                className={[
                  "min-w-0 flex-1",
                  "truncate",
                  "text-sm font-semibold",
                  "text-[var(--foreground)]",
                  "transition-opacity duration-200",
                  "group-hover:opacity-70",
                ].join(" ")}
                title={project.name}
              >
                {project.name}
              </h3>

              <div className="shrink-0">
                <ProjectTypeBadge type={project.type} />
              </div>
            </div>

            <p
              className={[
                "mt-1",
                "h-10",
                "overflow-hidden",
                "text-xs leading-5",
                "text-[var(--muted)]",
                "[display:-webkit-box]",
                "[-webkit-box-orient:vertical]",
                "[-webkit-line-clamp:2]",
              ].join(" ")}
              title={project.description}
            >
              {project.description}
            </p>

            {project.tags && project.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {project.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={[
                      "rounded-full",
                      "bg-[var(--surface)]",
                      "px-2 py-0.5",
                      "text-[10px] font-medium",
                      "text-[var(--muted)]",
                    ].join(" ")}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className={[
                "mt-3",
                "flex h-7",
                "items-center",
                "justify-between",
                "gap-2",
                "border-t border-[var(--border)]",
                "pt-2",
                "text-[11px]",
                "text-[var(--muted)]",
              ].join(" ")}
            >
              <span
                className="min-w-0 truncate"
                title={project.author.username}
              >
                by {project.author.username}
              </span>

              <span className="shrink-0 inline-flex items-center gap-1 leading-none">
                <Download className="h-3 w-3 shrink-0 self-center" />
                <span className="self-center">
                  {project.downloads.toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Link>
  );
}
