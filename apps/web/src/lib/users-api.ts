import type { Project } from "@selaura/types";

import { apiFetch, apiUrl } from "@/lib/api-client";
import type { Skin } from "@/lib/skins-api";

export interface ProfileUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  bio: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  githubUrl: string;
  createdAt: string;
}

export type FeaturedSkin = Pick<
  Skin,
  "id" | "slug" | "name" | "kind" | "pieceSlot" | "imageUrl"
>;

export interface UserProfile {
  user: ProfileUser;
  projects: Project[];
  featuredSkin: FeaturedSkin | null;
  isSelf: boolean;
}

export async function getUserProfile(
  username: string,
  cookieHeader?: string,
): Promise<UserProfile | null> {
  const response = await fetch(
    apiUrl(`/api/v1/users/${encodeURIComponent(username)}`),
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load profile (${response.status})`);
  }

  return (await response.json()) as UserProfile;
}

export interface UpdateProfileInput {
  bio: string;
  discordUrl: string;
  websiteUrl: string;
}

export async function updateProfile(
  username: string,
  input: UpdateProfileInput,
): Promise<ProfileUser> {
  const response = await apiFetch(`/api/v1/users/${encodeURIComponent(username)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to update profile");
  }

  const data = (await response.json()) as { user: ProfileUser };

  return data.user;
}
