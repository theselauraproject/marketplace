"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";

import Button from "@/components/ui/Button";
import { apiUrl } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AccountSwitcher } from "./AccountSwitcher";
import type { ActiveIdentity } from "@/lib/accounts-api";
import { SelauraLogo } from "../ui/SelauraLogo";

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, activeIdentity, loading, refetch, logout } = useCurrentUser();

  const githubLoginUrl = apiUrl("/api/v1/auth/github");

  const isStaff = user?.role === "admin" || user?.role === "moderator";

  useEffect(() => {
    const current =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";

    setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);

    setTheme(next);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    await logout();
    closeMenu();
  }

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50",
          "w-full",
          "border-b border-[var(--border)]",
          "bg-[var(--background)]/90",
          "backdrop-blur-xl",
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto flex h-16 w-full max-w-7xl",
            "items-center",
            "px-4 sm:px-6",
          ].join(" ")}
        >
          {}

          <Link
            href="/"
            onClick={closeMenu}
            aria-label="Selaura home"
            className={["flex shrink-0 items-center", "leading-none"].join(" ")}
          >
            <SelauraLogo
              includesText
              className={["block", "h-[26px] w-auto", "sm:h-[28px]"].join(" ")}
            />
          </Link>

          {}

          <nav
            className={[
              "ml-7 hidden h-full",
              "items-center gap-0.5 lg:flex",
            ].join(" ")}
          >
            <NavLink href="/library">Explore library</NavLink>

            {!loading && user && <NavLink href="/upload">Upload</NavLink>}

            {!loading && isStaff && (
              <NavLink href="/moderation">Moderation</NavLink>
            )}
          </nav>

          {}

          <div
            className={["ml-auto flex shrink-0", "items-center gap-2"].join(
              " ",
            )}
          >
            {}

            <Button
              type="button"
              variant="muted"
              iconOnly
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun size={17} strokeWidth={2} />
              ) : (
                <Moon size={17} strokeWidth={2} />
              )}
            </Button>

            {}

            <div className="hidden items-center gap-2 sm:flex">
              {!loading && user ? (
                <UserCluster
                  user={user}
                  activeIdentity={activeIdentity}
                  onSwitched={refetch}
                  onLogout={handleLogout}
                />
              ) : (
                <Button
                  href={githubLoginUrl}
                  variant="default"
                  className="h-9 px-3.5"
                >
                  Login
                </Button>
              )}
            </div>

            {}

            <Button
              type="button"
              variant="muted"
              iconOnly
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="h-9 w-9 lg:hidden"
            >
              {menuOpen ? (
                <X size={18} strokeWidth={2} />
              ) : (
                <Menu size={18} strokeWidth={2} />
              )}
            </Button>
          </div>
        </div>

        {}

        <div
          className={[
            "grid transition-[grid-template-rows]",
            "duration-200 ease-out",
            "lg:hidden",
            menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div
              className={[
                "border-t border-[var(--border)]",
                "bg-[var(--background)]",
              ].join(" ")}
            >
              <nav
                className={[
                  "mx-auto flex max-w-7xl",
                  "flex-col gap-0.5",
                  "p-3",
                ].join(" ")}
              >
                <MobileNavLink href="/library" onClick={closeMenu}>
                  Explore library
                </MobileNavLink>

                <MobileNavLink href="/resource-packs" onClick={closeMenu}>
                  Resource Packs
                </MobileNavLink>

                <MobileNavLink href="/mods" onClick={closeMenu}>
                  Mods
                </MobileNavLink>

                <MobileNavLink href="/worlds" onClick={closeMenu}>
                  Worlds
                </MobileNavLink>

                {!loading && user && (
                  <MobileNavLink href="/upload" onClick={closeMenu}>
                    Upload
                  </MobileNavLink>
                )}

                {!loading && isStaff && (
                  <MobileNavLink href="/moderation" onClick={closeMenu}>
                    Moderation
                  </MobileNavLink>
                )}

                <div
                  className={["my-2 h-px", "bg-[var(--border)]"].join(" ")}
                />

                {!loading && user ? (
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar user={user} size={32} />

                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                      {user.username}
                    </span>

                    <Button
                      type="button"
                      variant="muted"
                      iconOnly
                      aria-label="Log out"
                      onClick={handleLogout}
                      className="h-9 w-9 shrink-0"
                    >
                      <LogOut size={16} strokeWidth={2} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    href={githubLoginUrl}
                    variant="default"
                    className="mt-1 h-10 w-full px-3"
                    onClick={closeMenu}
                  >
                    Login
                  </Button>
                )}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {}

      <div className="h-16 shrink-0" aria-hidden="true" />
    </>
  );
}

function UserCluster({
  user,
  activeIdentity,
  onSwitched,
  onLogout,
}: {
  user: { username: string; avatarUrl: string | null };
  activeIdentity: ActiveIdentity | null;
  onSwitched: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <AccountSwitcher
        activeIdentity={
          activeIdentity ?? {
            kind: "user",
            id: "",
            username: user.username,
            avatarUrl: user.avatarUrl,
          }
        }
        onSwitched={onSwitched}
      />

      <Button
        type="button"
        variant="muted"
        iconOnly
        aria-label="Log out"
        onClick={onLogout}
        className="h-9 w-9"
      >
        <LogOut size={16} strokeWidth={2} />
      </Button>
    </div>
  );
}

function Avatar({
  user,
  size,
}: {
  user: { username: string; avatarUrl: string | null };
  size: number;
}) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-[var(--surface)]"
      style={{ height: size, width: size }}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full items-center justify-center font-semibold text-[var(--faint)]"
          style={{ fontSize: size * 0.4 }}
        >
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex h-9 items-center",
        "rounded-lg px-3",
        "text-sm font-medium",
        "leading-none",
        "text-[var(--foreground)]/60",
        "transition-colors duration-200",
        "hover:bg-[var(--surface)]",
        "hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "flex h-10 items-center",
        "rounded-lg px-3",
        "text-sm font-medium",
        "leading-none",
        "text-[var(--foreground)]/70",
        "transition-colors",
        "hover:bg-[var(--surface-hover)]",
        "hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
