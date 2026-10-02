"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Image as ImageIcon, X } from "lucide-react";

import type { Project, ProjectType } from "@selaura/types";

import { ProjectMarkdownEditor } from "@/components/projects/ProjectMarkdownEditor";
import { DeleteProjectDialog } from "@/components/projects/DeleteProjectDialog";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { getMetadata, type Metadata } from "@/lib/metadata-api";
import { updateProject } from "@/lib/projects-api";
import { inputClass } from "@/components/ui/fields";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataError, setMetadataError] = useState(false);

  const [project, setProject] = useState<(Project & { status: string }) | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [readme, setReadme] = useState("");
  const [type, setType] = useState<ProjectType>("mod");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [icon, setIcon] = useState<File | null>(null);
  const [headerImage, setHeaderImage] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    getMetadata()
      .then(setMetadata)
      .catch(() => setMetadataError(true));
  }, []);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    apiFetch(`/api/v1/projects/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.project) {
          throw new Error(data?.error ?? "Couldn't load that project");
        }

        return data.project as Project & { status: string };
      })
      .then((loaded) => {
        if (cancelled) return;

        if (!loaded.canManage) {
          router.replace(`/projects/${slug}`);
          return;
        }

        setProject(loaded);
        setName(loaded.name);
        setDescription(loaded.description);
        setReadme(loaded.readme ?? "");
        setType(loaded.type as ProjectType);
        setTags(loaded.tags ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Couldn't load that project",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;

    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }

    setTags([...tags, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((item) => item !== tag));
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }

    if (event.key === "Backspace" && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  function handleIcon(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) setIcon(selected);
  }

  function handleHeaderImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) setHeaderImage(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a project description.");
      return;
    }

    setSubmitting(true);

    try {
      await updateProject(slug, {
        name: name.trim(),
        description: description.trim(),
        readme,
        type,
        tags,
        icon: icon ?? undefined,
        header: headerImage ?? undefined,
      });

      setSuccess(true);
      router.push(`/projects/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-16 text-center sm:px-6">
        <p className="text-sm text-[var(--danger)]">{loadError}</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto w-full max-w-5xl animate-pulse px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 h-8 w-56 rounded bg-[var(--surface)]" />
        <div className="h-64 w-full rounded-xl bg-[var(--surface)]" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit project
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Saving sends {project.name} back for re-approval before your
            changes go live.
          </p>
        </div>

        <Button
          type="button"
          variant="muted"
          onClick={() => setDeleteOpen(true)}
        >
          Delete project
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section
          title="Basic information"
          description="Tell people what your project is."
        >
          <div className="space-y-5">
            <Field label="Project name" required>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Awesome Mod"
                className={inputClass}
              />
            </Field>

            <Field
              label="Description"
              required
              description="A short description shown when browsing projects."
            >
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className={[inputClass, "resize-y"].join(" ")}
              />
            </Field>

            <Field label="Project type" required>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(metadata?.types ?? []).map((item) => (
                  <Choice
                    key={item.value}
                    active={type === item.value}
                    onClick={() => setType(item.value)}
                  >
                    {item.label}
                  </Choice>
                ))}

                {!metadata && !metadataError && (
                  <p className="text-xs text-[var(--foreground)]/40">
                    Loading project types…
                  </p>
                )}
              </div>
            </Field>

            <Field label="Tags" description="Press Enter or comma to add a tag.">
              <div
                className={[
                  "flex min-h-11",
                  "flex-wrap items-center",
                  "gap-2",
                  "rounded-xl",
                  "border border-[var(--border)]",
                  "bg-[var(--background)]",
                  "px-3 py-2",
                  "focus-within:border-[var(--foreground)]/30",
                ].join(" ")}
              >
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-hover)] px-2.5 py-1 text-xs font-medium"
                  >
                    {tag}

                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}

                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length ? "" : "e.g. performance, utility"}
                  className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--faint)]"
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section
          title="Images"
          description="Replace the icon or banner shown on your project page."
        >
          <div className="space-y-5">
            <Field label="Icon">
              <IconUpload
                icon={icon}
                existingUrl={project.iconUrl ?? undefined}
                onChange={handleIcon}
              />
            </Field>

            <Field label="Header image">
              <HeaderImageUpload
                headerImage={headerImage}
                existingUrl={project.headerUrl ?? undefined}
                onChange={handleHeaderImage}
              />
            </Field>
          </div>
        </Section>

        <Section title="Readme" description="The full description of your project.">
          <ProjectMarkdownEditor value={readme} onChange={setReadme} />
        </Section>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {success && (
          <p className="text-sm text-[var(--success)]">Saved — redirecting…</p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="muted"
            onClick={() => router.push(`/projects/${slug}`)}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <DeleteProjectDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        slug={slug}
        projectName={project.name}
      />
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="selaura-surface rounded-2xl bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  description,
  required,
  children,
}: {
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-[var(--danger)]">*</span>}
        </label>

        {description && (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        )}
      </div>

      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center",
        "gap-2 rounded-lg",
        "border px-3 py-2",
        "text-xs font-medium",
        "transition",
        active
          ? "border-[var(--foreground)]/20 bg-[var(--surface-hover)] text-[var(--foreground)]"
          : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--foreground)]/20 hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {active && <Check size={13} />}
      {children}
    </button>
  );
}

function IconUpload({
  icon,
  existingUrl,
  onChange,
}: {
  icon: File | null;
  existingUrl?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const previewUrl = icon ? URL.createObjectURL(icon) : existingUrl;

  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--foreground)]/25">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
      />

      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-hover)]">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={20} className="text-[var(--muted)]" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium">
          {icon ? icon.name : "Replace icon"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Click to select a new image
        </p>
      </div>
    </label>
  );
}

function HeaderImageUpload({
  headerImage,
  existingUrl,
  onChange,
}: {
  headerImage: File | null;
  existingUrl?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const previewUrl = headerImage ? URL.createObjectURL(headerImage) : existingUrl;

  return (
    <label className="flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--foreground)]/25">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
      />

      <div className="flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-hover)]">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={20} className="text-[var(--muted)]" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium">
          {headerImage ? headerImage.name : "Replace header image"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Shown as the wide banner at the top of your project page
        </p>
      </div>
    </label>
  );
}

