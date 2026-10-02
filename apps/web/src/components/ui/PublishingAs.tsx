"use client";

import { Building2 } from "lucide-react";

import { useCurrentUser } from "@/lib/use-current-user";

export function PublishingAs({ className }: { className?: string }) {
  const { user, activeIdentity, loading } = useCurrentUser();

  if (loading || !user) {
    return null;
  }

  const identity = activeIdentity ?? {
    kind: "user" as const,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };

  return (
    <div
      className={[
        "inline-flex items-center gap-2",
        "rounded-xl border border-[var(--border)]",
        "px-3 py-1.5",
        "text-sm text-[var(--foreground)]/60",
        className ?? "",
      ].join(" ")}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-hover)]">
        {identity.avatarUrl ? (
          <img
            src={identity.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-semibold text-[var(--faint)]">
            {identity.username.charAt(0).toUpperCase()}
          </span>
        )}
      </span>

      <span>
        Publishing as{" "}
        <span className="font-medium text-[var(--foreground)]">
          {identity.username}
        </span>
      </span>

      {identity.kind === "org" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--foreground)]/50">
          <Building2 size={10} />
          Organization
        </span>
      )}
    </div>
  );
}
