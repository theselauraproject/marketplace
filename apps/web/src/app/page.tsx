import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { SearchBar } from "@/components/search/SearchBar";
import Button from "@/components/ui/Button";
import { getProjects } from "@/lib/projects-api";
import { FeaturedProjects } from "@/components/projects/FeaturedProjects";

export default async function Home() {
  const projects = await getProjects();

  return (
    <div className="w-full">
      {}

      <section
        className={[
          "relative overflow-hidden",
          "border-b border-[var(--border)]",
        ].join(" ")}
      >
        {}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={[
              "absolute left-1/2 top-[-250px]",
              "h-[500px] w-[800px]",
              "-translate-x-1/2",
              "rounded-full",
              "bg-[var(--foreground)]/[0.035]",
              "blur-[120px]",
            ].join(" ")}
          />
        </div>

        <div
          className={[
            "relative mx-auto max-w-7xl",
            "px-5 pb-16 pt-20",
            "sm:px-6 sm:pb-24 sm:pt-28",
          ].join(" ")}
        >
          <div className="mx-auto max-w-3xl text-center">
            {}

            <h1
              className={[
                "text-4xl font-semibold",
                "leading-tight tracking-tight",
                "sm:text-6xl sm:leading-tight",
              ].join(" ")}
            >
              Discover what&apos;s next
              <span className="block opacity-50">for Bedrock.</span>
            </h1>

            <p
              className={[
                "mx-auto mt-6 max-w-2xl",
                "text-sm leading-6",
                "text-[var(--foreground)]/55",
                "sm:text-lg sm:leading-7",
              ].join(" ")}
            >
              Discover mods, addons, resource packs, worlds, and more — all in
              one place.
            </p>

            {}

            <div className="mx-auto mt-8 max-w-2xl">
              <SearchBar />
            </div>

            {}

            <div
              className={[
                "mt-5 flex flex-wrap",
                "items-center justify-center",
                "gap-x-4 gap-y-2",
                "text-sm",
                "text-[var(--foreground)]/45",
              ].join(" ")}
            >
              <QuickLink href="/library?type=mod">Mods</QuickLink>

              <span className="opacity-30">•</span>

              <QuickLink href="library?type=resource_pack">
                Resource packs
              </QuickLink>

              <span className="opacity-30">•</span>

              <QuickLink href="library?type=shader">Shaders</QuickLink>
            </div>
          </div>
        </div>
      </section>

      {}

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <div
          className={["mb-8 flex items-end justify-between", "gap-6"].join(" ")}
        >
          <div>
            <p className="text-sm font-medium opacity-50">Explore</p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Featured projects
            </h2>

            <p className="mt-1 text-sm text-[var(--foreground)]/50">
              Popular projects from the community.
            </p>
          </div>

          <Link
            href="/library"
            className={[
              "hidden items-center gap-1",
              "text-sm font-medium",
              "text-[var(--foreground)]/50",
              "transition hover:text-[var(--foreground)]",
              "sm:flex",
            ].join(" ")}
          >
            View all
            <ArrowRight size={15} />
          </Link>
        </div>

        <FeaturedProjects projects={projects} />
      </section>

      {}

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 sm:pb-20">
        <div
          className={[
            "selaura-surface",
            "relative overflow-hidden",
            "rounded-2xl",
            "bg-[var(--surface)]",
            "p-6 sm:p-10",
          ].join(" ")}
        >
          <div
            className={[
              "pointer-events-none absolute",
              "-right-32 -top-32",
              "h-64 w-64",
              "rounded-full",
              "bg-[var(--foreground)]/[0.04]",
              "blur-3xl",
            ].join(" ")}
          />

          <div className="relative max-w-2xl">
            <p className="text-sm font-medium opacity-50">
              Create with Selaura
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Have something to share?
            </h2>

            <p
              className={[
                "mt-3 text-sm leading-6",
                "text-[var(--foreground)]/55",
              ].join(" ")}
            >
              Publish your projects, manage releases, and share your work with
              the Bedrock community.
            </p>

            <div className="mt-6">
              <Button
                href="/upload"
                variant="default"
                icon={<ArrowRight size={16} />}
                iconPosition="right"
              >
                Start publishing
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickLink({
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
