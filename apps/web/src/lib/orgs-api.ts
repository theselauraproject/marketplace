import type { Project } from "@selaura/types";

import { apiFetch, apiUrl } from "@/lib/api-client";

export interface OrgProfileInfo {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  githubUrl: string;
  createdAt: string;
}

export interface OrgPerson {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface OrgContributor extends OrgPerson {
  projectCount: number;
}

export interface OrgProfile {
  organization: OrgProfileInfo;
  projects: Project[];
  contributors: OrgContributor[];
  members: OrgPerson[];
  canEdit: boolean;
}

export async function getOrgProfile(
  login: string,
  cookieHeader?: string,
): Promise<OrgProfile | null> {
  const response = await fetch(
    apiUrl(`/api/v1/orgs/${encodeURIComponent(login)}`),
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load organization (${response.status})`);
  }

  return (await response.json()) as OrgProfile;
}

export interface UpdateOrgInput {
  bio: string;
  discordUrl: string;
  websiteUrl: string;
}

export async function updateOrgProfile(
  login: string,
  input: UpdateOrgInput,
): Promise<OrgProfileInfo> {
  const response = await apiFetch(
    `/api/v1/orgs/${encodeURIComponent(login)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to update organization");
  }

  const data = (await response.json()) as { organization: OrgProfileInfo };

  return data.organization;
}
