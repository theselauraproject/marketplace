import { Suspense } from "react";

import { getProjects } from "@/lib/projects-api";
import { ProjectLibrary } from "@/components/library/ProjectLibrary";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const projects = await getProjects();

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-4 sm:px-6 sm:py-6">
      <Suspense fallback={<LibraryFallback />}>
        <ProjectLibrary projects={projects} />
      </Suspense>
    </main>
  );
}

function LibraryFallback() {
  return (
    <div className="animate-pulse">
      <div className="selaura-surface h-12 w-full rounded-xl bg-[var(--surface)]" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="selaura-surface h-40 rounded-xl bg-[var(--surface)]" />
          <div className="selaura-surface h-40 rounded-xl bg-[var(--surface)]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="selaura-surface h-64 rounded-xl bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
