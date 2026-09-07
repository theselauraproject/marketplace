"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

type ModerationStatus = "pending" | "approved" | "rejected" | "hidden";

interface QueueProject {
  id: string;
  slug: string;
  name: string;
  description: string;
  type:
    | "mod"
    | "plugin"
    | "resource_pack"
    | "behavior_pack"
    | "world"
    | "skin_pack"
    | "shader"
    | "launcher";
  status: string;
  moderationNote: string | null;
  createdAt: string;
  author: {
    username: string;
    avatarUrl: string | null;
  };
}

const TABS: {
  value: ModerationStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "hidden", label: "Hidden" },
];

export default function ModerationPage() {
  const { user, loading } = useCurrentUser();

  const isStaff = user?.role === "admin" || user?.role === "moderator";

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-5">
        <Loader2
          size={22}
          className="animate-spin text-[var(--foreground)]/40"
        />
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Staff only</h1>

        <p className="mt-2 text-sm text-[var(--foreground)]/60">
          You don't have access to this page.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>

      <p className="mt-2 text-sm text-[var(--foreground)]/60">
        Review, hide, or remove projects.
      </p>

      <Queue />
    </main>
  );
}

function Queue() {
  const [tab, setTab] = useState<ModerationStatus>("pending");

  const [projects, setProjects] = useState<QueueProject[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [actingOn, setActingOn] = useState<string | null>(null);

  /*
   * Keyed by slug. Holds the in-progress note text for a
   * reject/hide action that's waiting for the moderator to
   * confirm, so the row can show an inline textarea instead of
   * immediately firing the request.
   */
  const [noteDrafts, setNoteDrafts] = useState<
    Record<string, { action: "rejected" | "hidden"; text: string }>
  >({});

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  async function loadQueue(status: ModerationStatus) {
    setError(null);
    setProjects(null);

    try {
      const response = await apiFetch(
        `/api/v1/projects/moderation/queue?status=${status}`,
      );

      if (!response.ok) {
        setError(`Failed to load queue (${response.status})`);
        return;
      }

      const data = (await response.json()) as {
        projects: QueueProject[];
      };

      setProjects(data.projects);
    } catch {
      setError("Failed to load the moderation queue.");
    }
  }

  useEffect(() => {
    loadQueue(tab);
  }, [tab]);

  async function updateStatus(
    slug: string,
    status: ModerationStatus,
    note?: string,
  ) {
    if (!slug) {
      setError("Cannot update project: the project slug is empty.");
      return;
    }

    setActingOn(slug);
    setError(null);

    try {
      const response = await apiFetch(
        `/api/v1/projects/${encodeURIComponent(slug)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            ...(note ? { note } : {}),
          }),
        },
      );

      const responseText = await response.text();

      let data: {
        error?: string;
      } = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {}
      }

      if (!response.ok) {
        setError(
          data.error ?? `Failed to update "${slug}" (${response.status})`,
        );
        return;
      }

      setProjects(
        (current) =>
          current?.filter((project) => project.slug !== slug) ?? null,
      );

      setNoteDrafts((current) => {
        const next = { ...current };
        delete next[slug];
        return next;
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update project.",
      );
    } finally {
      setActingOn(null);
    }
  }

  async function deleteProject(slug: string) {
    if (!slug) {
      return;
    }

    setActingOn(slug);
    setError(null);

    try {
      const response = await apiFetch(
        `/api/v1/projects/${encodeURIComponent(slug)}`,
        { method: "DELETE" },
      );

      const responseText = await response.text();

      let data: { error?: string } = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {}
      }

      if (!response.ok) {
        setError(
          data.error ?? `Failed to delete "${slug}" (${response.status})`,
        );
        return;
      }

      setProjects(
        (current) =>
          current?.filter((project) => project.slug !== slug) ?? null,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete project.",
      );
    } finally {
      setActingOn(null);
      setConfirmingDelete(null);
    }
  }

  function openNoteDraft(slug: string, action: "rejected" | "hidden") {
    setNoteDrafts((current) => ({
      ...current,
      [slug]: { action, text: "" },
    }));
  }

  function cancelNoteDraft(slug: string) {
    setNoteDrafts((current) => {
      const next = { ...current };
      delete next[slug];
      return next;
    });
  }

  return (
    <div className="mt-6">
      <div
        role="tablist"
        className={[
          "inline-flex items-center",
          "gap-0.5",
          "rounded-lg",
          "bg-[var(--surface)]",
          "p-0.5",
        ].join(" ")}
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={[
              "rounded-md",
              "px-3 py-1.5",
              "text-sm font-medium",
              "transition",
              tab === t.value
                ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
                : "text-[var(--foreground)]/50 hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {projects === null && !error && (
          <div className="flex justify-center py-10">
            <Loader2
              size={20}
              className="animate-spin text-[var(--foreground)]/40"
            />
          </div>
        )}

        {projects && projects.length === 0 && (
          <p className="text-sm text-[var(--foreground)]/45">Nothing here.</p>
        )}

        {projects?.map((project) => {
          const draft = noteDrafts[project.slug];

          return (
            <Card
              key={project.id}
              className="flex flex-col gap-3 rounded-xl p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="font-medium text-[var(--foreground)] hover:underline"
                    >
                      {project.name}
                    </Link>

                    <ProjectTypeBadge type={project.type} />
                  </div>

                  <p className="mt-1 line-clamp-1 text-sm text-[var(--foreground)]/55">
                    {project.description}
                  </p>

                  <p className="mt-1 text-xs text-[var(--faint)]">
                    by {project.author.username}
                  </p>

                  {project.moderationNote && (
                    <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                      Note: {project.moderationNote}
                    </p>
                  )}
                </div>

                {!draft && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="h-9 px-3"
                      icon={<Eye size={15} />}
                      href={`/projects/${project.slug}`}
                      target="_blank"
                    >
                      Preview
                    </Button>

                    {tab === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          className="h-9 px-3"
                          icon={<X size={15} />}
                          disabled={actingOn === project.slug}
                          onClick={() =>
                            openNoteDraft(project.slug, "rejected")
                          }
                        >
                          Reject
                        </Button>

                        <Button
                          variant="default"
                          className="h-9 px-3"
                          icon={<Check size={15} />}
                          disabled={actingOn === project.slug}
                          onClick={() => updateStatus(project.slug, "approved")}
                        >
                          Approve
                        </Button>
                      </>
                    )}

                    {tab === "approved" && (
                      <Button
                        variant="outline"
                        className="h-9 px-3"
                        icon={<EyeOff size={15} />}
                        disabled={actingOn === project.slug}
                        onClick={() => openNoteDraft(project.slug, "hidden")}
                      >
                        Hide
                      </Button>
                    )}

                    {tab === "hidden" && (
                      <Button
                        variant="default"
                        className="h-9 px-3"
                        icon={<RotateCcw size={15} />}
                        disabled={actingOn === project.slug}
                        onClick={() => updateStatus(project.slug, "approved")}
                      >
                        Unhide
                      </Button>
                    )}

                    {tab === "rejected" && (
                      <Button
                        variant="default"
                        className="h-9 px-3"
                        icon={<RotateCcw size={15} />}
                        disabled={actingOn === project.slug}
                        onClick={() => updateStatus(project.slug, "pending")}
                      >
                        Move to pending
                      </Button>
                    )}

                    {confirmingDelete === project.slug ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--danger)]">
                          Delete permanently?
                        </span>

                        <Button
                          variant="outline"
                          className="h-9 px-3 !border-[var(--danger)]/40 !text-[var(--danger)]"
                          disabled={actingOn === project.slug}
                          onClick={() => deleteProject(project.slug)}
                        >
                          Confirm
                        </Button>

                        <Button
                          variant="muted"
                          className="h-9 px-3"
                          onClick={() => setConfirmingDelete(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-9 px-3 !border-[var(--danger)]/30 !text-[var(--danger)]"
                        icon={<Trash2 size={15} />}
                        disabled={actingOn === project.slug}
                        onClick={() => setConfirmingDelete(project.slug)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {draft && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <label className="text-xs font-medium text-[var(--foreground)]/70">
                    Note to author{" "}
                    <span className="font-normal text-[var(--foreground)]/40">
                      (optional, but helps them understand why)
                    </span>
                  </label>

                  <textarea
                    value={draft.text}
                    onChange={(event) =>
                      setNoteDrafts((current: any) => ({
                        ...current,
                        [project.slug]: {
                          action: draft.action,
                          text: event.target.value,
                        },
                      }))
                    }
                    rows={2}
                    className={[
                      "mt-2 w-full",
                      "rounded-lg",
                      "border border-[var(--border)]",
                      "bg-[var(--surface)]",
                      "px-3 py-2",
                      "text-sm",
                      "outline-none",
                      "focus:border-[var(--foreground)]/25",
                    ].join(" ")}
                    placeholder={
                      draft.action === "hidden"
                        ? "e.g. reported for containing malware, under review"
                        : "e.g. doesn't meet the content guidelines"
                    }
                  />

                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="default"
                      className="h-8 px-3 text-xs"
                      disabled={actingOn === project.slug}
                      onClick={() =>
                        updateStatus(
                          project.slug,
                          draft.action,
                          draft.text.trim() || undefined,
                        )
                      }
                    >
                      Confirm {draft.action === "hidden" ? "hide" : "reject"}
                    </Button>

                    <Button
                      variant="muted"
                      className="h-8 px-3 text-xs"
                      onClick={() => cancelNoteDraft(project.slug)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}