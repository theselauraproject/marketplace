export function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "inline-flex items-center gap-1.5",
        "rounded-lg border border-[var(--border)]",
        "px-2.5 py-1.5",
        "text-xs font-medium",
        "text-[var(--foreground)]/60",
        "transition",
        "hover:border-[var(--foreground)]/20",
        "hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {icon}
      {label}
    </a>
  );
}
