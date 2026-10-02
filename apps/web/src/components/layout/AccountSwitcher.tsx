"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, User, X } from "lucide-react";

import {
  getAccounts,
  getLinkAccountUrl,
  leaveOrganization,
  switchAccount,
  unlinkAccount,
  type Account,
  type ActiveIdentity,
} from "@/lib/accounts-api";
import { useToast } from "@/components/ui/Toast";

interface AccountSwitcherProps {
  currentUser: { id: string; username: string };
  activeIdentity: ActiveIdentity | null;
  onSwitched: () => void;
}

export function AccountSwitcher({
  currentUser,
  activeIdentity,
  onSwitched,
}: AccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [switching, setSwitching] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const showToast = useToast();

  const containerRef = useRef<HTMLDivElement | null>(null);

  function loadAccounts() {
    getAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    loadAccounts();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSelect(account: Account) {
    if (
      activeIdentity &&
      activeIdentity.id === account.id &&
      activeIdentity.kind === account.kind
    ) {
      setOpen(false);
      return;
    }

    setSwitching(true);

    try {
      await switchAccount(account.kind, account.id);
      onSwitched();
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  }

  async function handleRemove(event: React.MouseEvent, account: Account) {
    event.stopPropagation();

    const key = `${account.kind}-${account.id}`;

    const confirmed = window.confirm(
      account.kind === "org"
        ? `Remove ${account.username} from your account switcher? If you're still a member on GitHub, it'll reappear next time you sign in.`
        : `Remove ${account.username} as a linked account? You can always link it again later.`,
    );

    if (!confirmed) {
      return;
    }

    setRemovingKey(key);

    try {
      if (account.kind === "org") {
        await leaveOrganization(account.id);
      } else {
        await unlinkAccount(account.id);
      }

      loadAccounts();
      onSwitched();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Couldn't remove that account",
        "warning",
      );
    } finally {
      setRemovingKey(null);
    }
  }

  const display: {
    username: string;
    avatarUrl: string | null;
  } = activeIdentity ?? {
    username: currentUser.username,
    avatarUrl: null,
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={[
          "flex h-9 items-center gap-1.5",
          "rounded-lg px-1.5",
          "transition",
          "hover:bg-[var(--surface)]",
        ].join(" ")}
      >
        <IdentityAvatar identity={display} size={26} />

        <span className="max-w-[8rem] truncate text-sm font-medium text-[var(--foreground)]">
          {display.username}
        </span>

        <ChevronDown size={14} className="text-[var(--foreground)]/40" />
      </button>

      {open && (
        <div
          className={[
            "absolute right-0 top-11 z-50",
            "w-72",
            "rounded-xl",
            "border border-[var(--border)]",
            "bg-[var(--background)]",
            "p-1.5",
            "shadow-[0_12px_30px_var(--shadow)]",
          ].join(" ")}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground)]/40">
            Post as
          </p>

          {accounts === null && (
            <p className="px-2.5 py-2 text-sm text-[var(--foreground)]/50">
              Loading…
            </p>
          )}

          {accounts?.map((account) => {
            const isActive =
              activeIdentity?.id === account.id &&
              activeIdentity?.kind === account.kind;

            const isPrimary =
              account.kind === "user" && account.id === currentUser.id;

            const key = `${account.kind}-${account.id}`;
            const isRemoving = removingKey === key;

            return (
              <div
                key={key}
                className="group/row flex w-full items-center gap-0.5"
              >
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => handleSelect(account)}
                  className={[
                    "flex min-w-0 flex-1 items-center gap-2",
                    "rounded-lg px-2.5 py-1.5",
                    "text-left text-sm",
                    "transition",
                    "hover:bg-[var(--surface)]",
                    "disabled:opacity-50",
                  ].join(" ")}
                >
                  <IdentityAvatar identity={account} size={22} />

                  <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                    {account.username}
                  </span>

                  {account.kind === "org" && (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--foreground)]/35">
                      Org
                    </span>
                  )}

                  {isActive && (
                    <Check
                      size={14}
                      className="shrink-0 text-[var(--foreground)]/60"
                    />
                  )}
                </button>

                {!isPrimary && (
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={(event) => handleRemove(event, account)}
                    aria-label={
                      account.kind === "org"
                        ? `Remove ${account.username}`
                        : `Remove linked account ${account.username}`
                    }
                    className={[
                      "shrink-0 rounded-lg p-1.5",
                      "text-[var(--foreground)]/30",
                      "opacity-0 transition",
                      "hover:bg-[var(--surface)] hover:text-[var(--danger)]",
                      "group-hover/row:opacity-100",
                      "disabled:opacity-50",
                    ].join(" ")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}

          <div className="my-1 h-px bg-[var(--border)]" />

          <Link
            href={`/u/${currentUser.username}`}
            onClick={() => setOpen(false)}
            className={[
              "flex w-full items-center gap-2",
              "rounded-lg px-2.5 py-1.5",
              "text-sm text-[var(--foreground)]/60",
              "transition",
              "hover:bg-[var(--surface)]",
              "hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <User size={14} />
            View profile
          </Link>

          <a
            href={getLinkAccountUrl()}
            className={[
              "flex w-full items-center gap-2",
              "rounded-lg px-2.5 py-1.5",
              "text-sm text-[var(--foreground)]/60",
              "transition",
              "hover:bg-[var(--surface)]",
              "hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <Plus size={14} />
            Add GitHub account
          </a>
        </div>
      )}
    </div>
  );
}

function IdentityAvatar({
  identity,
  size,
}: {
  identity: {
    username: string;
    avatarUrl: string | null;
  };
  size: number;
}) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-[var(--surface)]"
      style={{ height: size, width: size }}
    >
      {identity.avatarUrl ? (
        <img
          src={identity.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full items-center justify-center font-semibold text-[var(--faint)]"
          style={{ fontSize: size * 0.4 }}
        >
          {identity.username.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
