"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Globe, MessageCircle, Pencil, Shield, X } from "lucide-react";

import { GithubIcon } from "@/components/icons/GithubIcon";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkinViewer3D } from "@/components/skins/SkinViewer3D";
import { setFeaturedSkin } from "@/lib/skins-api";
import { updateProfile, type UserProfile } from "@/lib/users-api";
import { inputClass } from "@/components/ui/fields";
import { SocialLink } from "@/components/ui/SocialLink";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState(profile.user);

  const [bio, setBio] = useState(user.bio ?? "");
  const [discordUrl, setDiscordUrl] = useState(user.discordUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featuredSkin, setFeaturedSkinState] = useState(profile.featuredSkin);
  const [unfeaturing, setUnfeaturing] = useState(false);

  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  function startEditing() {
    setBio(user.bio ?? "");
    setDiscordUrl(user.discordUrl ?? "");
    setWebsiteUrl(user.websiteUrl ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateProfile(user.username, {
        bio,
        discordUrl,
        websiteUrl,
      });
      setUser(updated);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnfeature() {
    setUnfeaturing(true);

    try {
      await setFeaturedSkin(null, user.username);
      setFeaturedSkinState(null);
    } catch {
    } finally {
      setUnfeaturing(false);
    }
  }

  return (
    <Card className="overflow-visible p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--background)]">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[var(--faint)]">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {user.username}
            </h1>

            {(user.role === "admin" || user.role === "moderator") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--foreground)]/50">
                <Shield size={11} />
                {user.role}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-[var(--foreground)]/40">
            Member since {joined}
          </p>

          {!editing && (
            <>
              {user.bio && (
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--foreground)]/70">
                  {user.bio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SocialLink
                  href={user.githubUrl}
                  icon={<GithubIcon size={14} />}
                  label="GitHub"
                />

                {user.discordUrl && (
                  <SocialLink
                    href={user.discordUrl}
                    icon={<MessageCircle size={14} />}
                    label="Discord"
                  />
                )}

                {user.websiteUrl && (
                  <SocialLink
                    href={user.websiteUrl}
                    icon={<Globe size={14} />}
                    label="Website"
                  />
                )}
              </div>
            </>
          )}
        </div>

        {featuredSkin && !editing && (
          <div className="shrink-0">
            <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
              Featured skin
            </p>

            <div className="relative">
              <Link href={`/skins/${featuredSkin.slug}`}>
                <SkinViewer3D
                  src={featuredSkin.imageUrl}
                  width={110}
                  height={140}
                  interactive={false}
                />
              </Link>

              {profile.isSelf && (
                <button
                  type="button"
                  onClick={handleUnfeature}
                  disabled={unfeaturing}
                  aria-label="Remove featured skin"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition hover:opacity-80 disabled:opacity-50"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {profile.isSelf && !editing && (
          <Button
            type="button"
            variant="muted"
            icon={<Pencil size={14} />}
            onClick={startEditing}
            className="shrink-0"
          >
            Edit profile
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Bio</label>

            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Tell people a bit about yourself"
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
              <label className="mb-2 block text-sm font-medium">
                Website
              </label>

              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://your-site.com"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}

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
