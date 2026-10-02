"use client";

import { Search } from "lucide-react";

interface SkinSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SkinSearchInput({
  value,
  onChange,
  placeholder = "Search skins and pieces…",
  className,
}: SkinSearchInputProps) {
  return (
    <div className={["relative w-full", className ?? ""].join(" ")}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
      />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--foreground)]/30"
      />
    </div>
  );
}
