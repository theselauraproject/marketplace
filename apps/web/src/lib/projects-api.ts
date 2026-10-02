import type { Project } from "@selaura/types";

import { apiFetch, apiUrl } from "@/lib/api-client";

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

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  readme?: string;
  tags?: string[];
}

/**
 * Edits a project the current user (or their active org) can manage.
 * The server always sends the listing back to "pending" for re-approval
 * after an edit, so the updated fields won't reflect in the public
 * library until a moderator reviews them again.
 */
export async function updateProject(
  slug: string,
  input: UpdateProjectInput,
): Promise<Project & { status: string }> {
  const response = await apiFetch(`/api/v1/projects/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  const responseText = await response.text();
  let data: { project?: Project & { status: string }; error?: string } = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      // Ignore — handled by the !response.ok branch below.
    }
  }

  if (!response.ok || !data.project) {
    throw new Error(data.error ?? `Failed to update project (${response.status})`);
  }

  return data.project;
}

export async function deleteProject(slug: string): Promise<void> {
  const response = await apiFetch(`/api/v1/projects/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const responseText = await response.text();
    let data: { error?: string } = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        // Ignore — falls through to the generic message below.
      }
    }

    throw new Error(data.error ?? `Failed to delete project (${response.status})`);
  }
}
