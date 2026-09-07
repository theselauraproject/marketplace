import Link from "next/link";
import { SelauraLogo } from "../ui/SelauraLogo";

export function Footer() {
  return (
    <footer
      className={[
        "mt-20",
        "border-t border-[var(--border)]",
        "bg-[var(--background)]",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex max-w-7xl flex-col gap-8",
          "px-6 py-10",
          "md:flex-row md:items-center md:justify-between",
        ].join(" ")}
      >
        <div>
          <Link href="/" className="font-semibold tracking-tight">
            <SelauraLogo includesText className="h-7 w-auto" />
          </Link>

          <p className="mt-2 text-sm text-[var(--foreground)]/50">
            A community marketplace for Minecraft Bedrock.
          </p>
        </div>

        <nav
          className={[
            "flex flex-wrap gap-x-6 gap-y-3",
            "text-sm text-[var(--foreground)]/50",
          ].join(" ")}
        >
          <FooterLink href="/library">Library</FooterLink>

          <FooterLink href="/about">About</FooterLink>

          <FooterLink href="/terms">Terms</FooterLink>

          <FooterLink href="/privacy">Privacy</FooterLink>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-[var(--foreground)]"
          >
            GitHub
          </a>
        </nav>
      </div>

      <div
        className={[
          "border-t border-[var(--border)]",
          "py-5 text-center",
          "text-xs text-[var(--foreground)]/35",
        ].join(" ")}
      >
        © {new Date().getFullYear()} Selaura Marketplace
        <p>NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT</p>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="transition hover:text-[var(--foreground)]">
      {children}
    </Link>
  );
}
