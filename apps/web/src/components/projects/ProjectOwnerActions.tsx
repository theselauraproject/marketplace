"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { DeleteProjectDialog } from "@/components/projects/DeleteProjectDialog";

interface ProjectOwnerActionsProps {
  slug: string;
  name: string;
}

export function ProjectOwnerActions({ slug, name }: ProjectOwnerActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="muted"
          icon={<Pencil size={14} />}
          href={`/projects/${slug}/edit`}
        >
          Edit
        </Button>

        <Button
          type="button"
          variant="muted"
          icon={<Trash2 size={14} />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <DeleteProjectDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        slug={slug}
        projectName={name}
      />
    </div>
  );
}
