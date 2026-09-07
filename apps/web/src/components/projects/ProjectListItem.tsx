import Link from "next/link";
import { Download } from "lucide-react";

import type { Project } from "@selaura/types";

import { Card } from "@/components/ui/Card";
import { ProjectTypeBadge } from "./ProjectTypeBadge";

interface ProjectListItemProps {
  project: Project;
}

export function ProjectListItem({ project }: ProjectListItemProps) {
  return (
    <Link href={`/projects/${project.slug}`} className="group block">
      <Card
        className={[
          "flex items-center",
          "gap-4",
          "overflow-hidden",
          "p-3",
          "transition-[box-shadow]",
          "duration-300 ease-out",
          "group-hover:shadow-lg",
        ].join(" ")}
      >
        {}
        <div
          className={[
            "h-14 w-14",
            "shrink-0",
            "overflow-hidden",
            "rounded-lg",
            "bg-[var(--surface)]",
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
                "flex h-full w-full",
                "items-center justify-center",
                "text-lg font-semibold",
                "text-[var(--faint)]",
              ].join(" ")}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h3
              className={[
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
              "mt-0.5",
              "truncate",
              "text-xs",
              "text-[var(--muted)]",
            ].join(" ")}
            title={project.description}
          >
            {project.description}
          </p>
        </div>

        {}
        <div
          className={[
            "shrink-0",
            "flex flex-col items-end justify-center",
            "gap-0.5",
            "text-xs",
            "text-[var(--muted)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
            <Download className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
            <span>{project.downloads.toLocaleString()}</span>
          </div>
          <div
            className="truncate text-[11px] max-w-[140px]"
            title={project.author.username}
          >
            by {project.author.username}
          </div>
        </div>
      </Card>
    </Link>
  );
}
