"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import type { Project } from "@selaura/types";

import { getProjects } from "@/lib/projects-api";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";

const MAX_SUGGESTIONS = 6;

export function SearchBar() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const [allProjects, setAllProjects] = useState<Project[] | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  function ensureProjectsLoaded() {
    if (allProjects !== null) {
      return;
    }

    getProjects()
      .then(setAllProjects)
      .catch(() => setAllProjects([]));
  }

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed || !allProjects) {
      return [];
    }

    return allProjects
      .filter((project) => {
        const haystack = [
          project.name,
          project.description,
          ...(project.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(trimmed);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [query, allProjects]);

  const rowCount = suggestions.length + 1;

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function goToLibrarySearch(value: string) {
    const trimmed = value.trim();

    router.push(
      trimmed ? `/library?search=${encodeURIComponent(trimmed)}` : "/library",
    );

    setOpen(false);
  }

  function goToProject(project: Project) {
    router.push(`/projects/${project.slug}`);
    setOpen(false);
  }

  function activateRow(index: number) {
    if (index < suggestions.length) {
      goToProject(suggestions[index]);
    } else {
      goToLibrarySearch(query);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    activateRow(highlighted);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, rowCount - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={[
            "selaura-surface",
            "flex h-12 w-full items-center",
            "rounded-xl",
            "bg-[var(--surface)]",
            "px-4",
            "transition-all duration-200",
            "focus-within:bg-[var(--surface-hover)]",
            "focus-within:shadow-[0_8px_28px_var(--shadow)]",
          ].join(" ")}
        >
          <Search
            size={19}
            strokeWidth={1.8}
            className={["mr-3 shrink-0", "text-[var(--foreground)]/40"].join(
              " ",
            )}
          />

          <input
            value={query}
            onFocus={() => {
              ensureProjectsLoaded();
              setOpen(true);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search mods, addons, resource packs..."
            className={[
              "min-w-0 flex-1",
              "bg-transparent",
              "text-sm",
              "text-[var(--foreground)]",
              "outline-none",
              "placeholder:text-[var(--foreground)]/35",
            ].join(" ")}
          />

          <kbd
            className={[
              "hidden shrink-0 sm:flex",
              "h-6 min-w-6",
              "items-center justify-center",
              "rounded-md",
              "border border-[var(--border)]",
              "bg-[var(--surface-hover)]",
              "px-1.5",
              "text-[11px]",
              "font-medium",
              "text-[var(--foreground)]/40",
            ].join(" ")}
          >
            /
          </kbd>
        </div>
      </form>

      {open && query.trim() && (
        <div
          className={[
            "absolute left-0 right-0 top-14 z-50",
            "overflow-hidden",
            "rounded-xl",
            "border border-[var(--border)]",
            "bg-[var(--background)]",
            "py-1.5",
            "text-left",
            "shadow-[0_16px_40px_var(--shadow)]",
          ].join(" ")}
        >
          {allProjects === null && (
            <p className="px-4 py-3 text-sm text-[var(--foreground)]/45">
              Loading…
            </p>
          )}

          {allProjects && suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-[var(--foreground)]/45">
              No matches yet — press enter to search the full library.
            </p>
          )}

          {suggestions.map((project, index) => (
            <button
              key={project.id}
              type="button"
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => goToProject(project)}
              className={[
                "flex w-full items-center gap-3",
                "px-4 py-2",
                "text-left",
                highlighted === index ? "bg-[var(--surface)]" : "",
              ].join(" ")}
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]">
                {project.iconUrl && (
                  <img
                    src={project.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                {project.name}
              </span>

              <ProjectTypeBadge type={project.type} />
            </button>
          ))}

          <button
            type="button"
            onMouseEnter={() => setHighlighted(suggestions.length)}
            onClick={() => goToLibrarySearch(query)}
            className={[
              "flex w-full items-center gap-3",
              "border-t border-[var(--border)]",
              "px-4 py-2.5",
              "text-left text-sm",
              "text-[var(--foreground)]/70",
              highlighted === suggestions.length ? "bg-[var(--surface)]" : "",
            ].join(" ")}
          >
            <Search
              size={15}
              className="shrink-0 text-[var(--foreground)]/40"
            />
            Search for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
