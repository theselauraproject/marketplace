"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Globe, MessageCircle, Pencil } from "lucide-react";

import { GithubIcon } from "@/components/icons/GithubIcon";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateOrgProfile, type OrgProfile } from "@/lib/orgs-api";
import { inputClass } from "@/components/ui/fields";
import { SocialLink } from "@/components/ui/SocialLink";

interface OrgHeaderProps {
  profile: OrgProfile;
}

export function OrgHeader({ profile }: OrgHeaderProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [org, setOrg] = useState(profile.organization);

  const [bio, setBio] = useState(org.bio ?? "");
  const [discordUrl, setDiscordUrl] = useState(org.discordUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(org.websiteUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const created = new Date(org.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  function startEditing() {
    setBio(org.bio ?? "");
    setDiscordUrl(org.discordUrl ?? "");
    setWebsiteUrl(org.websiteUrl ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateOrgProfile(org.login, {
        bio,
        discordUrl,
        websiteUrl,
      });
      setOrg(updated);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save organization",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-visible p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--background)]">
          {org.avatarUrl ? (
            <img
              src={org.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[var(--faint)]">
              {org.login.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {org.name ?? org.login}
            </h1>

            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--foreground)]/50">
              <Building2 size={11} />
              Organization
            </span>
          </div>

          {org.name && org.name !== org.login && (
            <p className="mt-0.5 text-sm text-[var(--foreground)]/50">
              @{org.login}
            </p>
          )}

          <p className="mt-1 text-xs text-[var(--foreground)]/40">
            On Selaura since {created}
          </p>

          {!editing && (
            <>
              {org.bio && (
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--foreground)]/70">
                  {org.bio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SocialLink
                  href={org.githubUrl}
                  icon={<GithubIcon size={14} />}
                  label="GitHub"
                />

                {org.discordUrl && (
                  <SocialLink
                    href={org.discordUrl}
                    icon={<MessageCircle size={14} />}
                    label="Discord"
                  />
                )}

                {org.websiteUrl && (
                  <SocialLink
                    href={org.websiteUrl}
                    icon={<Globe size={14} />}
                    label="Website"
                  />
                )}
              </div>
            </>
          )}
        </div>

        {profile.canEdit && !editing && (
          <Button
            type="button"
            variant="muted"
            icon={<Pencil size={14} />}
            onClick={startEditing}
            className="shrink-0"
          >
            Edit organization
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
          <div>
            <label className="mb-2 block text-sm font-medium">About</label>

            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Tell people what this organization is about"
              className={[inputClass, "resize-y"].join(" ")}
            />

            <p className="mt-1 text-right text-[11px] text-[var(--faint)]">
              {bio.length}/280
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Discord link
              </label>

              <input
                value={discordUrl}
                onChange={(event) => setDiscordUrl(event.target.value)}
                placeholder="https://discord.gg/your-invite"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Website</label>

              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://your-site.com"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <div className="flex items-center gap-2">
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save changes"}
            </Button>

            <Button
              type="button"
              variant="muted"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
