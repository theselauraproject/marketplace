"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import {
  Check,
  ChevronDown,
  FileArchive,
  Image as ImageIcon,
  Plus,
  Upload,
  X,
} from "lucide-react";

import type { ProjectType } from "@selaura/types";

import { ProjectMarkdownEditor } from "@/components/projects/ProjectMarkdownEditor";
import { apiFetch } from "@/lib/api-client";
import { getMetadata, type Metadata } from "@/lib/metadata-api";

export default function UploadPage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const [metadataError, setMetadataError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMetadata()
      .then((data) => {
        if (!cancelled) {
          setMetadata(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetadataError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [readme, setReadme] = useState("");

  const [type, setType] = useState<ProjectType>("mod");

  const [tags, setTags] = useState<string[]>([]);

  const [tagInput, setTagInput] = useState("");

  const [gameVersions, setGameVersions] = useState<string[]>([]);

  const [loaders, setLoaders] = useState<string[]>([]);

  const [environments, setEnvironments] = useState<string[]>([]);

  const [resolutions, setResolutions] = useState<string[]>([]);

  const [file, setFile] = useState<File | null>(null);

  const [icon, setIcon] = useState<File | null>(null);

  const [headerImage, setHeaderImage] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  function addTag() {
    const tag = tagInput.trim();

    if (!tag) {
      return;
    }

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

  function toggleValue(
    value: string,
    current: string[],
    setter: (values: string[]) => void,
  ) {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
    } else {
      setter([...current, value]);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (selected) {
      setFile(selected);
    }
  }

  function handleIcon(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (selected) {
      setIcon(selected);
    }
  }

  function handleHeaderImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (selected) {
      setHeaderImage(selected);
    }
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

    if (!file) {
      setError("Please select a project file.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("name", name.trim());

      formData.append("description", description.trim());

      formData.append("type", type);

      formData.append("readme", readme);

      formData.append("tags", JSON.stringify(tags));

      formData.append("gameVersions", gameVersions.join(","));

      formData.append("loaders", loaders.join(","));

      formData.append("environments", environments.join(","));

      formData.append("resolutions", resolutions.join(","));

      formData.append("file", file);

      if (icon) {
        formData.append("icon", icon);
      }

      if (headerImage) {
        formData.append("header", headerImage);
      }

      const response = await apiFetch("/api/v1/projects", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? `Upload failed (${response.status})`);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload project
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Share your project with the Selaura community.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {}

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
                placeholder="A lightweight performance mod for Minecraft..."
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

                {metadataError && (
                  <p className="text-xs text-red-400">
                    Couldn&apos;t load project types. Try refreshing the page.
                  </p>
                )}
              </div>
            </Field>

            <Field
              label="Tags"
              description="Press Enter or comma to add a tag."
            >
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
                    className={[
                      "inline-flex",
                      "items-center",
                      "gap-1",
                      "rounded-lg",
                      "bg-[var(--surface-hover)]",
                      "px-2.5 py-1",
                      "text-xs font-medium",
                    ].join(" ")}
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
                  onBlur={addTag}
                  placeholder={
                    tags.length
                      ? "Add another..."
                      : "performance, pvp, utility..."
                  }
                  className={[
                    "min-w-[180px]",
                    "flex-1",
                    "bg-transparent",
                    "py-1",
                    "text-sm",
                    "outline-none",
                    "placeholder:text-[var(--faint)]",
                  ].join(" ")}
                />
              </div>
            </Field>
          </div>
        </Section>

        {}

        <Section
          title="Compatibility"
          description="Tell users what versions and environments your project supports."
        >
          <ChoiceGroup
            label="Game versions"
            values={metadata?.gameVersions ?? []}
            selected={gameVersions}
            onToggle={(value) =>
              toggleValue(value, gameVersions, setGameVersions)
            }
          />

          <ChoiceGroup
            label="Loaders"
            values={metadata?.loaders.map((item) => item.value) ?? []}
            labels={Object.fromEntries(
              (metadata?.loaders ?? []).map((item) => [item.value, item.label]),
            )}
            selected={loaders}
            onToggle={(value) => toggleValue(value, loaders, setLoaders)}
          />

          <ChoiceGroup
            label="Environment"
            values={metadata?.environments.map((item) => item.value) ?? []}
            labels={Object.fromEntries(
              (metadata?.environments ?? []).map((item) => [
                item.value,
                item.label,
              ]),
            )}
            selected={environments}
            onToggle={(value) =>
              toggleValue(value, environments, setEnvironments)
            }
          />

          {type === "resource_pack" && (
            <ChoiceGroup
              label="Resolution"
              values={metadata?.resolutions ?? []}
              selected={resolutions}
              onToggle={(value) =>
                toggleValue(value, resolutions, setResolutions)
              }
            />
          )}
        </Section>

        {}

        <Section
          title="README"
          description="Give your project a proper description with GitHub-style Markdown."
        >
          <ProjectMarkdownEditor
            value={readme}
            onChange={setReadme}
            placeholder={[
              "# My Awesome Mod",
              "",
              "Describe your project here...",
              "",
              "## Features",
              "",
              "- Feature one",
              "- Feature two",
            ].join("\n")}
          />
        </Section>

        {}

        <Section
          title="Files"
          description="Upload the project file that users will download."
        >
          <FileDropzone
            file={file}
            onChange={handleFile}
            accept=".mcpack,.mcaddon,.mcworld,.zip"
          />

          <div className="mt-5">
            <Field
              label="Project icon"
              description="Optional. PNG, JPG, or WebP."
            >
              <IconUpload icon={icon} onChange={handleIcon} />
            </Field>
          </div>

          <div className="mt-5">
            <Field
              label="Header image"
              description="Optional. Shown as a wide banner on your project page and as the thumbnail in grid view. PNG, JPG, or WebP."
            >
              <HeaderImageUpload
                headerImage={headerImage}
                onChange={handleHeaderImage}
              />
            </Field>
          </div>
        </Section>

        {}

        {error && (
          <div
            className={[
              "rounded-xl",
              "border border-red-500/20",
              "bg-red-500/5",
              "px-4 py-3",
              "text-sm text-red-500",
            ].join(" ")}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className={[
              "flex items-center gap-2",
              "rounded-xl",
              "border border-green-500/20",
              "bg-green-500/5",
              "px-4 py-3",
              "text-sm text-green-500",
            ].join(" ")}
          >
            <Check size={16} />
            Project submitted successfully. It will appear after approval.
          </div>
        )}

        {}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className={[
              "inline-flex",
              "items-center gap-2",
              "rounded-xl",
              "bg-[var(--foreground)]",
              "px-5 py-2.5",
              "text-sm font-semibold",
              "text-[var(--background)]",
              "transition",
              "hover:opacity-90",
              "disabled:cursor-not-allowed",
              "disabled:opacity-50",
            ].join(" ")}
          >
            <Upload size={16} />

            {submitting ? "Submitting..." : "Submit project"}
          </button>
        </div>
      </form>
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
    <section
      className={[
        "rounded-2xl",
        "border border-[var(--border)]",
        "bg-[var(--surface)]",
        "p-5 sm:p-6",
      ].join(" ")}
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold">{title}</h2>

        {description && (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
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

          {required && <span className="ml-1 text-red-500">*</span>}
        </label>

        {description && (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
        )}
      </div>

      {children}
    </div>
  );
}

function ChoiceGroup({
  label,
  values,
  selected,
  onToggle,
  labels,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="mb-2 text-sm font-medium">{label}</p>

      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Choice
            key={value}
            active={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {labels?.[value] ?? value}
          </Choice>
        ))}
      </div>
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
          ? [
              "border-[var(--foreground)]/20",
              "bg-[var(--surface-hover)]",
              "text-[var(--foreground)]",
            ]
          : [
              "border-[var(--border)]",
              "bg-[var(--background)]",
              "text-[var(--muted)]",
              "hover:border-[var(--foreground)]/20",
              "hover:text-[var(--foreground)]",
            ],
      ]
        .flat()
        .join(" ")}
    >
      {active && <Check size={13} />}

      {children}
    </button>
  );
}

function FileDropzone({
  file,
  onChange,
  accept,
}: {
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accept: string;
}) {
  return (
    <label
      className={[
        "flex min-h-36",
        "cursor-pointer",
        "items-center justify-center",
        "rounded-xl",
        "border border-dashed",
        "border-[var(--border)]",
        "bg-[var(--background)]",
        "px-5 py-6",
        "transition",
        "hover:border-[var(--foreground)]/25",
        "hover:bg-[var(--surface-hover)]",
      ].join(" ")}
    >
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />

      {file ? (
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-10 w-10",
              "items-center justify-center",
              "rounded-lg",
              "bg-[var(--surface-hover)]",
            ].join(" ")}
          >
            <FileArchive size={19} />
          </div>

          <div>
            <p className="text-sm font-medium">{file.name}</p>

            <p className="text-xs text-[var(--muted)]">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Upload size={22} className="mx-auto text-[var(--muted)]" />

          <p className="mt-3 text-sm font-medium">
            Drop your project file here
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">or click to browse</p>

          <p className="mt-2 text-[10px] text-[var(--faint)]">
            .mcpack · .mcaddon · .mcworld · .zip
          </p>
        </div>
      )}
    </label>
  );
}

function IconUpload({
  icon,
  onChange,
}: {
  icon: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer",
        "items-center gap-4",
        "rounded-xl",
        "border border-dashed",
        "border-[var(--border)]",
        "bg-[var(--background)]",
        "p-4",
        "transition",
        "hover:border-[var(--foreground)]/25",
      ].join(" ")}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
      />

      <div
        className={[
          "flex h-14 w-14",
          "shrink-0 items-center",
          "justify-center",
          "overflow-hidden",
          "rounded-xl",
          "bg-[var(--surface-hover)]",
        ].join(" ")}
      >
        {icon ? (
          <img
            src={URL.createObjectURL(icon)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon size={20} className="text-[var(--muted)]" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium">
          {icon ? icon.name : "Choose an icon"}
        </p>

        <p className="mt-1 text-xs text-[var(--muted)]">
          Click to select an image
        </p>
      </div>
    </label>
  );
}

function HeaderImageUpload({
  headerImage,
  onChange,
}: {
  headerImage: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer",
        "flex-col gap-3",
        "rounded-xl",
        "border border-dashed",
        "border-[var(--border)]",
        "bg-[var(--background)]",
        "p-4",
        "transition",
        "hover:border-[var(--foreground)]/25",
      ].join(" ")}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
      />

      <div
        className={[
          "flex aspect-[3/1] w-full",
          "items-center justify-center",
          "overflow-hidden",
          "rounded-lg",
          "bg-[var(--surface-hover)]",
        ].join(" ")}
      >
        {headerImage ? (
          <img
            src={URL.createObjectURL(headerImage)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon size={20} className="text-[var(--muted)]" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium">
          {headerImage ? headerImage.name : "Choose a header image"}
        </p>

        <p className="mt-1 text-xs text-[var(--muted)]">
          Shown as the wide banner at the top of your project page
        </p>
      </div>
    </label>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const inputClass = [
  "w-full",
  "rounded-xl",
  "border border-[var(--border)]",
  "bg-[var(--background)]",
  "px-3.5 py-2.5",
  "text-sm",
  "text-[var(--foreground)]",
  "outline-none",
  "transition",
  "placeholder:text-[var(--faint)]",
  "focus:border-[var(--foreground)]/30",
  "focus:ring-2",
  "focus:ring-[var(--foreground)]/5",
].join(" ");
