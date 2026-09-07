import type { Project } from "@selaura/types";

import { apiUrl } from "@/lib/api-client";

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(apiUrl("/api/v1/projects"), {
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to load projects (${response.status})`);
  }

  const data = (await response.json()) as {
    projects: Project[];
  };

  return data.projects;
}

export async function searchProjects(query: string): Promise<Project[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const response = await fetch(
    apiUrl(`/api/v1/projects/search?q=${encodeURIComponent(trimmed)}`),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    projects: Project[];
  };

  return data.projects;
}

export interface ProjectVersion {
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
}

export interface ProjectDetail {
  project: Project & { status: string };
  versions: ProjectVersion[];
}

export async function getProjectBySlug(
  slug: string,
  cookieHeader?: string,
): Promise<ProjectDetail | null> {
  const response = await fetch(apiUrl(`/api/v1/projects/${slug}`), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load project (${response.status})`);
  }

  return (await response.json()) as ProjectDetail;
}
