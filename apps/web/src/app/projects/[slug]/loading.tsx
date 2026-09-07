export default function ProjectPageLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 h-4 w-28 rounded bg-[var(--surface)]" />

      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <div className="selaura-surface overflow-hidden rounded-xl">
          <div className="aspect-[3/1] w-full bg-[var(--surface)]" />

          <div className="space-y-3 px-6 pb-6 pt-12">
            <div className="h-6 w-1/3 rounded bg-[var(--surface)]" />
            <div className="h-4 w-1/5 rounded bg-[var(--surface)]" />
            <div className="mt-4 h-3 w-full max-w-md rounded bg-[var(--surface)]" />
            <div className="h-3 w-full max-w-sm rounded bg-[var(--surface)]" />
          </div>
        </div>

        <div className="selaura-surface h-fit space-y-4 rounded-xl p-5">
          <div className="h-9 w-full rounded-lg bg-[var(--surface)]" />
          <div className="h-9 w-full rounded-lg bg-[var(--surface)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--surface)]" />
          <div className="h-4 w-1/2 rounded bg-[var(--surface)]" />
        </div>
      </div>
    </div>
  );
}
