import type { ProjectType } from "@selaura/types";

interface ProjectTypeBadgeProps {
  type: ProjectType;
}

const labels: Record<ProjectType, string> = {
  mod: "Mod",
  plugin: "Plugin",
  resource_pack: "Resource Pack",
  behavior_pack: "Behavior Pack",
  world: "World",
  skin_pack: "Skin Pack",
  shader: "Shader",
  launcher: "Launcher",
};

export function ProjectTypeBadge({ type }: ProjectTypeBadgeProps) {
  return (
    <span
      className="
                inline-flex
                shrink-0
                items-center
                rounded-md
                border
                border-[var(--border)]
                bg-[var(--surface)]
                px-2
                py-1
                text-xs
                font-medium
                text-[var(--foreground)]
            "
    >
      {labels[type]}
    </span>
  );
}
