import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrgHeader } from "@/components/profile/OrgHeader";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getOrgProfile, type OrgPerson } from "@/lib/orgs-api";
import { getCookieHeader } from "@/lib/server-cookies";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ login: string }>;
}

async function loadOrg(login: string) {
  const cookieHeader = await getCookieHeader();

  return getOrgProfile(login, cookieHeader);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { login } = await params;
  const profile = await loadOrg(login);

  if (!profile) {
    return { title: "Organization not found — Selaura Marketplace" };
  }

  const { organization } = profile;

  return {
    title: `${organization.name ?? organization.login} — Selaura Marketplace`,
    description:
      organization.bio ??
      `Projects published by ${organization.login} on Selaura Marketplace.`,
  };
}

export default async function OrganizationPage({ params }: PageProps) {
  const { login } = await params;
  const profile = await loadOrg(login);

  if (!profile) {
    notFound();
  }

  const contributorIds = new Set(profile.contributors.map((c) => c.id));
  const otherMembers = profile.members.filter((m) => !contributorIds.has(m.id));

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
      <OrgHeader profile={profile} />

      {profile.contributors.length > 0 && (
        <PeopleRow
          title="Contributors"
          people={profile.contributors}
          detail={(person) => {
            const count = profile.contributors.find(
              (c) => c.id === person.id,
            )?.projectCount;

            return count ? String(count) : undefined;
          }}
        />
      )}

      {otherMembers.length > 0 && (
        <PeopleRow title="Members" people={otherMembers} />
      )}

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

function PeopleRow({
  title,
  people,
  detail,
}: {
  title: string;
  people: OrgPerson[];
  detail?: (person: OrgPerson) => string | undefined;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>

        <span className="text-sm text-[var(--foreground)]/40">
          {people.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/u/${person.username}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] py-1.5 pl-1.5 pr-3 text-sm font-medium text-[var(--foreground)]/70 transition hover:border-[var(--foreground)]/20 hover:text-[var(--foreground)]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-hover)]">
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-semibold text-[var(--faint)]">
                  {person.username.charAt(0).toUpperCase()}
                </span>
              )}
            </span>

            {person.username}

            {detail?.(person) && (
              <span className="text-xs text-[var(--foreground)]/35">
                {detail(person)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
