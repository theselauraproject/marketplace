"use client";

import type { ReactNode } from "react";

import Button from "@/components/ui/Button";

interface DownloadButtonProps {
  url: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "muted" | "footer";
}

export function DownloadButton({
  url,
  children,
  icon,
  className,
  variant,
}: DownloadButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      icon={icon}
      className={className}
      onClick={() => {
        window.location.href = url;
      }}
    >
      {children}
    </Button>
  );
}
