import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={[
        "selaura-surface",
        "rounded-xl",
        "bg-[var(--surface)]",
        "text-[var(--foreground)]",
        "transition-all",
        "duration-300",
        "hover:bg-[var(--surface-hover)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
