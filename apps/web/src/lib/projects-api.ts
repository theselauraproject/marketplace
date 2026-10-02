import type { Project } from "@selaura/types";

import { apiFetch, apiUrl } from "@/lib/api-client";

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(apiUrl("/api/v1/projects"), {
    cache: "no-store",
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

export async function getRecommendedProjects(): Promise<Project[]> {
  const response = await apiFetch("/api/v1/recommendations");

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { projects?: Project[] };
  return data.projects ?? [];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  readme?: string;
  type?: string;
  tags?: string[];
  icon?: File;
  header?: File;
}

export async function updateProject(
  slug: string,
  input: UpdateProjectInput,
): Promise<Project & { status: string }> {
  const formData = new FormData();

  if (input.name !== undefined) formData.append("name", input.name);
  if (input.description !== undefined)
    formData.append("description", input.description);
  if (input.readme !== undefined) formData.append("readme", input.readme);
  if (input.type !== undefined) formData.append("type", input.type);
  if (input.tags !== undefined)
    formData.append("tags", JSON.stringify(input.tags));
  if (input.icon) formData.append("icon", input.icon);
  if (input.header) formData.append("header", input.header);

  const response = await apiFetch(`/api/v1/projects/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: formData,
  });

  const responseText = await response.text();
  let data: { project?: Project & { status: string }; error?: string } = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
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
      }
    }

    throw new Error(data.error ?? `Failed to delete project (${response.status})`);
  }
}

export async function toggleProjectLike(
  slug: string,
): Promise<{ liked: boolean; likesCount: number }> {
  const response = await apiFetch(`/api/v1/projects/${encodeURIComponent(slug)}/like`, {
    method: "POST",
  });

  const responseText = await response.text();
  let data: { liked?: boolean; likesCount?: number; error?: string } = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
    }
  }

  if (!response.ok || typeof data.liked !== "boolean") {
    throw new Error(data.error ?? `Failed to like project (${response.status})`);
  }

  return { liked: data.liked, likesCount: data.likesCount ?? 0 };
}
