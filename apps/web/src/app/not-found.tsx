import { ArrowLeft, Compass } from "lucide-react";

import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main
      className={[
        "flex min-h-[calc(100vh-68px)]",
        "items-center justify-center",
        "px-5 py-16",
        "sm:px-6",
      ].join(" ")}
    >
      <div className="w-full max-w-xl text-center">
        {}

        <div
          className={[
            "mx-auto mb-6",
            "flex h-14 w-14",
            "items-center justify-center",
            "rounded-2xl",
            "border border-[var(--border)]",
            "bg-[var(--surface)]",
            "text-[var(--foreground)]",
            "shadow-sm",
          ].join(" ")}
        >
          <Compass size={26} strokeWidth={1.8} />
        </div>

        {}

        <p
          className={[
            "text-xs font-semibold",
            "tracking-[0.15em]",
            "text-[var(--muted)]",
          ].join(" ")}
        >
          PAGE NOT FOUND
        </p>

        {}

        <h1
          className={[
            "mt-3",
            "text-7xl font-bold",
            "tracking-tight",
            "text-[var(--foreground)]",
            "sm:text-8xl",
          ].join(" ")}
        >
          404
        </h1>

        <h2
          className={[
            "mt-4",
            "text-xl font-semibold",
            "text-[var(--foreground)]",
          ].join(" ")}
        >
          This page doesn&apos;t exist.
        </h2>

        <p
          className={[
            "mx-auto mt-3 max-w-md",
            "text-sm leading-6",
            "text-[var(--muted)]",
          ].join(" ")}
        >
          The page you&apos;re looking for may have been moved, deleted, or
          never existed in the first place.
        </p>

        {}

        <div
          className={[
            "mt-8 flex flex-col",
            "items-stretch justify-center",
            "gap-3",
            "sm:flex-row sm:items-center",
          ].join(" ")}
        >
          <Button
            href="/"
            variant="default"
            icon={<ArrowLeft size={16} />}
            iconPosition="left"
            className="w-full sm:w-auto"
          >
            Back to Selaura
          </Button>

          <Button
            href="/library"
            variant="muted"
            icon={<Compass size={16} />}
            iconPosition="left"
            className="w-full sm:w-auto"
          >
            Explore library
          </Button>
        </div>
      </div>
    </main>
  );
}
