"use client";

interface VersionRow {
  id: string;
  version: string;
  downloadUrl: string;
  createdAt: string;
}

interface VersionsListProps {
  versions: VersionRow[];
}

export function VersionsList({ versions }: VersionsListProps) {
  return (
    <div className="space-y-1">
      {versions.map((version) => (
        <button
          key={version.id}
          type="button"
          onClick={() => {
            window.location.href = version.downloadUrl;
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-[var(--surface)]"
        >
          <span className="min-w-0 truncate font-medium">
            {version.version}
          </span>

          <span className="shrink-0 text-xs text-[var(--foreground)]/40">
            {new Date(version.createdAt).toLocaleDateString()}
          </span>
        </button>
      ))}
    </div>
  );
}
