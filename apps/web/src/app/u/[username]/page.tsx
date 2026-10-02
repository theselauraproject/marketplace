import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getUserProfile } from "@/lib/users-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function loadProfile(username: string) {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return getUserProfile(username, cookieHeader);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);

  if (!profile) {
    return { title: "User not found — Selaura Marketplace" };
  }

  return {
    title: `${profile.user.username} — Selaura Marketplace`,
    description:
      profile.user.bio ??
      `Projects published by ${profile.user.username} on Selaura Marketplace.`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await loadProfile(username);

  if (!profile) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
      <ProfileHeader profile={profile} />

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Projects</h2>

          <span className="text-sm text-[var(--foreground)]/40">
            {profile.projects.length}
          </span>
        </div>

        <ProjectGrid projects={profile.projects} />
      </div>
    </main>
  );
}
