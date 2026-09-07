"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { useSearchParams } from "next/navigation";

import type {
  GameVersion,
  Project,
  ProjectEnvironment,
  ProjectLoader,
  ProjectType,
  ResourcePackResolution,
} from "@selaura/types";

import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { getMetadata, type Metadata } from "@/lib/metadata-api";

interface ProjectLibraryProps {
  projects: Project[];
}

type SortOption = "relevance" | "downloads" | "newest" | "updated" | "name";

type ViewMode = "card" | "list";

const INITIAL_VISIBLE = 18;
const LOAD_MORE_COUNT = 12;

export function ProjectLibrary({ projects }: ProjectLibraryProps) {
  const searchParams = useSearchParams();

  const [metadata, setMetadata] = useState<Metadata | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMetadata()
      .then((data) => {
        if (!cancelled) {
          setMetadata(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const PROJECT_TYPES = metadata?.types ?? [];
  const PROJECT_LOADERS = metadata?.loaders ?? [];
  const ENVIRONMENTS = metadata?.environments ?? [];

  const GAME_VERSIONS = useMemo(
    () =>
      (metadata?.gameVersions ?? []).map((value) => ({ value, label: value })),
    [metadata],
  );

  const RESOLUTIONS = useMemo(
    () =>
      (metadata?.resolutions ?? []).map((value) => ({ value, label: value })),
    [metadata],
  );

  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");

  const [selectedTypes, setSelectedTypes] = useState<ProjectType[]>(() =>
    getInitialTypes(searchParams),
  );

  const [selectedVersions, setSelectedVersions] = useState<GameVersion[]>(() =>
    getInitialVersions(searchParams),
  );

  const [selectedLoaders, setSelectedLoaders] = useState<ProjectLoader[]>(() =>
    getInitialLoaders(searchParams),
  );

  const [selectedEnvironments, setSelectedEnvironments] = useState<
    ProjectEnvironment[]
  >(() => getInitialEnvironments(searchParams));

  const [selectedResolutions, setSelectedResolutions] = useState<
    ResourcePackResolution[]
  >(() => getInitialResolutions(searchParams));

  const [sort, setSort] = useState<SortOption>(() =>
    getInitialSort(searchParams),
  );

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const [versionsOpen, setVersionsOpen] = useState(false);

  const [loadersOpen, setLoadersOpen] = useState(false);

  const [environmentOpen, setEnvironmentOpen] = useState(false);

  const [resolutionsOpen, setResolutionsOpen] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const typeCounts = useMemo(() => {
    const counts = {} as Record<ProjectType, number>;

    for (const type of PROJECT_TYPES) {
      counts[type.value] = projects.filter(
        (project) => project.type === type.value,
      ).length;
    }

    return counts;
  }, [projects]);

  const versionCounts = useMemo(() => {
    const counts = new Map<GameVersion, number>();

    for (const project of projects) {
      for (const version of project.gameVersions ?? []) {
        counts.set(version, (counts.get(version) ?? 0) + 1);
      }
    }

    return counts;
  }, [projects]);

  const loaderCounts = useMemo(() => {
    const counts = new Map<ProjectLoader, number>();

    for (const project of projects) {
      for (const loader of project.loaders ?? []) {
        counts.set(loader, (counts.get(loader) ?? 0) + 1);
      }
    }

    return counts;
  }, [projects]);

  const environmentCounts = useMemo(() => {
    const counts = new Map<ProjectEnvironment, number>();

    for (const project of projects) {
      for (const environment of project.environments ?? []) {
        counts.set(environment, (counts.get(environment) ?? 0) + 1);
      }
    }

    return counts;
  }, [projects]);

  const resolutionCounts = useMemo(() => {
    const counts = new Map<ResourcePackResolution, number>();

    for (const project of projects) {
      for (const resolution of project.resolutions ?? []) {
        counts.set(resolution, (counts.get(resolution) ?? 0) + 1);
      }
    }

    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (query) {
        const searchableText = [
          project.name,
          project.description,
          project.author.username,
          project.type,
          ...(project.loaders ?? []),
          ...(project.gameVersions ?? []),
          ...(project.environments ?? []),
          ...(project.resolutions ?? []),
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      if (selectedTypes.length > 0 && !selectedTypes.includes(project.type)) {
        return false;
      }

      if (
        selectedVersions.length > 0 &&
        !selectedVersions.some((version) =>
          project.gameVersions?.includes(version),
        )
      ) {
        return false;
      }

      if (
        selectedLoaders.length > 0 &&
        !selectedLoaders.some((loader) => project.loaders?.includes(loader))
      ) {
        return false;
      }

      if (selectedEnvironments.length > 0) {
        const matches = selectedEnvironments.some((environment) => {
          if (project.environments?.includes("both")) {
            return true;
          }

          return project.environments?.includes(environment);
        });

        if (!matches) {
          return false;
        }
      }

      if (
        selectedResolutions.length > 0 &&
        !selectedResolutions.some((resolution) =>
          project.resolutions?.includes(resolution),
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    projects,
    search,
    selectedTypes,
    selectedVersions,
    selectedLoaders,
    selectedEnvironments,
    selectedResolutions,
  ]);

  const sortedProjects = useMemo(() => {
    const result = [...filteredProjects];

    result.sort((a, b) => {
      switch (sort) {
        case "downloads":
          return (b.downloads ?? 0) - (a.downloads ?? 0);

        case "newest":
          return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);

        case "updated":
          return getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);

        case "name":
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });

        case "relevance":
        default:
          return (b.downloads ?? 0) - (a.downloads ?? 0);
      }
    });

    return result;
  }, [filteredProjects, sort]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [
    search,
    selectedTypes,
    selectedVersions,
    selectedLoaders,
    selectedEnvironments,
    selectedResolutions,
    sort,
  ]);

  const visibleProjects = sortedProjects.slice(0, visibleCount);

  const hasMore = visibleCount < sortedProjects.length;

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        setVisibleCount((current) =>
          Math.min(current + LOAD_MORE_COUNT, sortedProjects.length),
        );
      },
      {
        rootMargin: "500px",
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasMore, sortedProjects.length]);

  function toggleType(type: ProjectType) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  function toggleVersion(version: GameVersion) {
    setSelectedVersions((current) =>
      current.includes(version)
        ? current.filter((item) => item !== version)
        : [...current, version],
    );
  }

  function toggleLoader(loader: ProjectLoader) {
    setSelectedLoaders((current) =>
      current.includes(loader)
        ? current.filter((item) => item !== loader)
        : [...current, loader],
    );
  }

  function toggleEnvironment(environment: ProjectEnvironment) {
    setSelectedEnvironments((current) =>
      current.includes(environment)
        ? current.filter((item) => item !== environment)
        : [...current, environment],
    );
  }

  function toggleResolution(resolution: ResourcePackResolution) {
    setSelectedResolutions((current) =>
      current.includes(resolution)
        ? current.filter((item) => item !== resolution)
        : [...current, resolution],
    );
  }

  function clearFilters() {
    setSearch("");
    setSelectedTypes([]);
    setSelectedVersions([]);
    setSelectedLoaders([]);
    setSelectedEnvironments([]);
    setSelectedResolutions([]);
    setSort("relevance");
  }

  const hasFilters =
    search.trim().length > 0 ||
    selectedTypes.length > 0 ||
    selectedVersions.length > 0 ||
    selectedLoaders.length > 0 ||
    selectedEnvironments.length > 0 ||
    selectedResolutions.length > 0;

  return (
    <div>
      {}

      <div className="relative">
        <Search
          size={19}
          strokeWidth={1.8}
          className={[
            "pointer-events-none",
            "absolute left-4 top-1/2",
            "-translate-y-1/2",
            "z-10",
            "text-[var(--foreground)]/40",
          ].join(" ")}
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search mods, addons, resource packs..."
          className={[
            "selaura-surface",
            "h-12 w-full",
            "rounded-xl",
            "bg-[var(--surface)]",
            "pl-11 pr-11",
            "text-sm",
            "text-[var(--foreground)]",
            "outline-none",
            "placeholder:text-[var(--foreground)]/35",
            "transition-all duration-200",
            "focus:bg-[var(--surface-hover)]",
            "focus:shadow-[0_8px_28px_var(--shadow)]",
          ].join(" ")}
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className={[
              "absolute right-3 top-1/2",
              "-translate-y-1/2",
              "z-10",
              "flex h-7 w-7",
              "items-center justify-center",
              "rounded-md",
              "text-[var(--foreground)]/40",
              "transition",
              "hover:bg-[var(--surface-hover)]",
              "hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {}

      <div
        className={[
          "mt-8 grid gap-8",
          "lg:grid-cols-[230px_minmax(0,1fr)]",
        ].join(" ")}
      >
        {}

        <aside>
          <div className={["pr-1", "scrollbar-thin"].join(" ")}>
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal
                size={15}
                className="text-[var(--foreground)]/50"
              />

              <h2 className="text-sm font-semibold">Filters</h2>
            </div>

            <div className="space-y-1">
              {}

              <FilterSection
                label="Categories"
                open={categoriesOpen}
                onToggle={() => setCategoriesOpen((value) => !value)}
              >
                <FilterButton
                  active={selectedTypes.length === 0}
                  label="All projects"
                  count={projects.length}
                  onClick={() => setSelectedTypes([])}
                />

                {PROJECT_TYPES.map((type) => (
                  <FilterButton
                    key={type.value}
                    active={selectedTypes.includes(type.value)}
                    label={type.label}
                    count={typeCounts[type.value] ?? 0}
                    onClick={() => toggleType(type.value)}
                  />
                ))}
              </FilterSection>

              {}

              <FilterSection
                label="Game versions"
                open={versionsOpen}
                onToggle={() => setVersionsOpen((value) => !value)}
              >
                {GAME_VERSIONS.map((version) => (
                  <FilterButton
                    key={version.value}
                    active={selectedVersions.includes(version.value)}
                    label={version.label}
                    count={versionCounts.get(version.value) ?? 0}
                    onClick={() => toggleVersion(version.value)}
                  />
                ))}
              </FilterSection>

              {}

              <FilterSection
                label="Loaders"
                open={loadersOpen}
                onToggle={() => setLoadersOpen((value) => !value)}
              >
                {PROJECT_LOADERS.map((loader) => (
                  <FilterButton
                    key={loader.value}
                    active={selectedLoaders.includes(loader.value)}
                    label={loader.label}
                    count={loaderCounts.get(loader.value) ?? 0}
                    onClick={() => toggleLoader(loader.value)}
                  />
                ))}
              </FilterSection>

              {}

              <FilterSection
                label="Environment"
                open={environmentOpen}
                onToggle={() => setEnvironmentOpen((value) => !value)}
              >
                {ENVIRONMENTS.map((environment) => (
                  <FilterButton
                    key={environment.value}
                    active={selectedEnvironments.includes(environment.value)}
                    label={environment.label}
                    count={environmentCounts.get(environment.value) ?? 0}
                    onClick={() => toggleEnvironment(environment.value)}
                  />
                ))}
              </FilterSection>

              {}

              <FilterSection
                label="Resolution"
                open={resolutionsOpen}
                onToggle={() => setResolutionsOpen((value) => !value)}
              >
                {RESOLUTIONS.map((resolution) => (
                  <FilterButton
                    key={resolution.value}
                    active={selectedResolutions.includes(resolution.value)}
                    label={resolution.label}
                    count={resolutionCounts.get(resolution.value) ?? 0}
                    onClick={() => toggleResolution(resolution.value)}
                  />
                ))}
              </FilterSection>
            </div>
          </div>
        </aside>

        {}

        <section className="min-w-0">
          {}

          <div
            className={[
              "mb-5 flex flex-wrap",
              "items-center justify-between",
              "gap-3",
            ].join(" ")}
          >
            <p className="text-sm text-[var(--foreground)]/50">
              {filteredProjects.length.toLocaleString()}{" "}
              {filteredProjects.length === 1 ? "project" : "projects"}
            </p>

            <div className="flex items-center gap-2">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={[
                    "mr-2",
                    "text-xs font-medium",
                    "text-[var(--foreground)]/50",
                    "transition",
                    "hover:text-[var(--foreground)]",
                  ].join(" ")}
                >
                  Clear filters
                </button>
              )}

              <div
                role="group"
                aria-label="View"
                className={[
                  "flex items-center",
                  "gap-0.5",
                  "rounded-lg",
                  "bg-[var(--surface)]",
                  "p-0.5",
                ].join(" ")}
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "card"}
                  aria-label="Card view"
                  onClick={() => setViewMode("card")}
                  className={[
                    "flex h-8 w-8",
                    "items-center justify-center",
                    "rounded-md",
                    "transition",
                    viewMode === "card"
                      ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
                      : "text-[var(--foreground)]/40 hover:text-[var(--foreground)]",
                  ].join(" ")}
                >
                  <LayoutGrid size={16} />
                </button>

                <button
                  type="button"
                  aria-pressed={viewMode === "list"}
                  aria-label="List view"
                  onClick={() => setViewMode("list")}
                  className={[
                    "flex h-8 w-8",
                    "items-center justify-center",
                    "rounded-md",
                    "transition",
                    viewMode === "list"
                      ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
                      : "text-[var(--foreground)]/40 hover:text-[var(--foreground)]",
                  ].join(" ")}
                >
                  <List size={16} />
                </button>
              </div>

              <label className="flex items-center gap-2">
                <span className="hidden text-xs text-[var(--foreground)]/40 sm:block">
                  Sort
                </span>

                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SortOption)
                  }
                  className={[
                    "h-9",
                    "rounded-lg",
                    "bg-[var(--surface)]",
                    "px-3",
                    "text-xs font-medium",
                    "text-[var(--foreground)]",
                    "outline-none",
                    "transition",
                    "hover:bg-[var(--surface-hover)]",
                  ].join(" ")}
                >
                  <option value="relevance">Relevance</option>

                  <option value="downloads">Most downloads</option>

                  <option value="newest">Newest</option>

                  <option value="updated">Recently updated</option>

                  <option value="name">A–Z</option>
                </select>
              </label>
            </div>
          </div>

          {}

          {hasFilters && (
            <div className="mb-5 flex flex-wrap gap-2">
              {selectedTypes.map((type) => (
                <FilterChip
                  key={`type-${type}`}
                  label={
                    PROJECT_TYPES.find((item) => item.value === type)?.label ??
                    type
                  }
                  onRemove={() => toggleType(type)}
                />
              ))}

              {selectedVersions.map((version) => (
                <FilterChip
                  key={`version-${version}`}
                  label={version}
                  onRemove={() => toggleVersion(version)}
                />
              ))}

              {selectedLoaders.map((loader) => (
                <FilterChip
                  key={`loader-${loader}`}
                  label={formatLoaderName(loader)}
                  onRemove={() => toggleLoader(loader)}
                />
              ))}

              {selectedEnvironments.map((environment) => (
                <FilterChip
                  key={`environment-${environment}`}
                  label={
                    ENVIRONMENTS.find((item) => item.value === environment)
                      ?.label ?? environment
                  }
                  onRemove={() => toggleEnvironment(environment)}
                />
              ))}

              {selectedResolutions.map((resolution) => (
                <FilterChip
                  key={`resolution-${resolution}`}
                  label={resolution}
                  onRemove={() => toggleResolution(resolution)}
                />
              ))}
            </div>
          )}

          {}

          {filteredProjects.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <>
              {viewMode === "card" ? (
                <div
                  className={[
                    "grid grid-cols-1",
                    "gap-4",
                    "sm:grid-cols-2",
                    "xl:grid-cols-3",
                  ].join(" ")}
                >
                  {visibleProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className={["flex flex-col", "gap-2"].join(" ")}>
                  {visibleProjects.map((project) => (
                    <ProjectListItem key={project.id} project={project} />
                  ))}
                </div>
              )}

              {hasMore && (
                <div ref={loadMoreRef} className="h-24" aria-hidden="true" />
              )}

              {!hasMore && visibleProjects.length > 0 && (
                <p className="py-10 text-center text-xs text-[var(--foreground)]/35">
                  You&apos;ve reached the end.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] pb-1">
      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex w-full items-center",
          "justify-between",
          "rounded-lg px-3 py-2.5",
          "text-left",
          "text-sm font-medium",
          "text-[var(--foreground)]/70",
          "transition",
          "hover:bg-[var(--surface)]",
          "hover:text-[var(--foreground)]",
        ].join(" ")}
      >
        <span>{label}</span>

        {open ? (
          <ChevronUp size={15} className="text-[var(--foreground)]/40" />
        ) : (
          <ChevronDown size={15} className="text-[var(--foreground)]/40" />
        )}
      </button>

      {open && <div className="mb-2 space-y-0.5">{children}</div>}
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center",
        "justify-between gap-3",
        "rounded-lg px-3 py-2",
        "text-left text-sm",
        "transition-colors",
        active
          ? [
              "bg-[var(--foreground)]/[0.08]",
              "font-medium",
              "text-[var(--foreground)]",
            ].join(" ")
          : [
              "text-[var(--foreground)]/55",
              "hover:bg-[var(--surface)]",
              "hover:text-[var(--foreground)]",
            ].join(" "),
      ].join(" ")}
    >
      <span className="min-w-0 truncate">{label}</span>

      <span
        className={[
          "shrink-0",
          "text-xs tabular-nums",
          active
            ? "text-[var(--foreground)]/60"
            : "text-[var(--foreground)]/35",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-lg",
        "bg-[var(--surface)]",
        "px-2.5 py-1.5",
        "text-xs font-medium",
        "text-[var(--foreground)]/65",
        "transition",
        "hover:bg-[var(--surface-hover)]",
        "hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      <span>{label}</span>

      <X size={12} />
    </button>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div
      className={[
        "flex min-h-[320px]",
        "flex-col items-center",
        "justify-center",
        "rounded-2xl",
        "border border-dashed",
        "border-[var(--border)]",
        "px-6 text-center",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10",
          "items-center justify-center",
          "rounded-xl",
          "bg-[var(--surface)]",
        ].join(" ")}
      >
        <Search size={18} className="text-[var(--foreground)]/40" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">No projects found</h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--foreground)]/45">
        Try changing your search or removing one of your filters.
      </p>

      <button
        type="button"
        onClick={onClear}
        className={[
          "mt-4",
          "text-xs font-medium",
          "text-[var(--foreground)]/60",
          "underline underline-offset-4",
          "hover:text-[var(--foreground)]",
        ].join(" ")}
      >
        Clear filters
      </button>
    </div>
  );
}

function getInitialTypes(params: URLSearchParams): ProjectType[] {
  return params.getAll("type") as ProjectType[];
}

function getInitialVersions(params: URLSearchParams): GameVersion[] {
  return params.getAll("version") as GameVersion[];
}

function getInitialLoaders(params: URLSearchParams): ProjectLoader[] {
  return params.getAll("loader") as ProjectLoader[];
}

function getInitialEnvironments(params: URLSearchParams): ProjectEnvironment[] {
  return params.getAll("environment") as ProjectEnvironment[];
}

function getInitialResolutions(
  params: URLSearchParams,
): ResourcePackResolution[] {
  return params.getAll("resolution") as ResourcePackResolution[];
}

function getInitialSort(params: URLSearchParams): SortOption {
  const value = params.get("sort");

  if (
    value === "relevance" ||
    value === "downloads" ||
    value === "newest" ||
    value === "updated" ||
    value === "name"
  ) {
    return value;
  }

  return "relevance";
}

function getTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatLoaderName(loader: string): string {
  return loader
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
