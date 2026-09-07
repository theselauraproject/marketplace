import type { Project } from "@selaura/types";

import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: Project[];
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div
        className="
                    rounded-xl
                    border
                    border-dashed
                    border-[var(--selaura-border)]
                    px-6
                    py-16
                    text-center
                "
      >
        <p className="text-sm text-[var(--selaura-text-muted)]">
          No projects found.
        </p>
      </div>
    );
  }

  return (
    <div
      className="
                grid
                grid-cols-1
                gap-5
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
            "
    >
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
