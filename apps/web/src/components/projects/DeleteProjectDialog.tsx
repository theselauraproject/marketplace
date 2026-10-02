"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import Button from "@/components/ui/Button";
import { deleteProject } from "@/lib/projects-api";

interface DeleteProjectDialogProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  projectName: string;
}

export function DeleteProjectDialog({
  open,
  onClose,
  slug,
  projectName,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const matches = confirmText.trim() === projectName;

  async function handleDelete() {
    if (!matches) return;

    setBusy(true);
    setError(null);

    try {
      await deleteProject(slug);
      router.push("/library");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete that project",
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--danger)]/20 bg-[var(--background)] p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
            <AlertTriangle size={17} />
          </div>

          <div>
            <h2 className="text-base font-semibold">Delete this project?</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/60">
              This permanently deletes {projectName} and every version of it.
              This can&apos;t be undone.
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/70">
            Type <strong>{projectName}</strong> to confirm
          </span>

          <input
            autoFocus
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--danger)]/40 focus:ring-2 focus:ring-[var(--danger)]/10"
          />
        </label>

        {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="muted"
            disabled={busy}
            onClick={() => {
              setConfirmText("");
              onClose();
            }}
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!matches || busy}
            onClick={handleDelete}
            className="!bg-[var(--danger)] !text-white hover:!opacity-90"
          >
            {busy ? "Deleting…" : "Delete project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
