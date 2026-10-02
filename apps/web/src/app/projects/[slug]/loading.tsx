export default function ProjectPageLoading() {
  return (
    <main className="w-full animate-pulse">
      <div className="h-48 w-full bg-[var(--surface)] sm:h-64" />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
        <div className="grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="-mt-8 mb-5 inline-flex max-w-full items-end gap-4 rounded-2xl bg-[var(--background)] p-3 pr-5 sm:-mt-10 sm:p-4">
              <div className="h-20 w-20 shrink-0 rounded-2xl border-4 border-[var(--background)] bg-[var(--surface-hover)] sm:h-24 sm:w-24" />

              <div className="min-w-0 flex-1 space-y-2 pb-1">
                <div className="h-6 w-40 rounded bg-[var(--surface)]" />
                <div className="h-3.5 w-24 rounded bg-[var(--surface)]" />
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <div className="h-3 w-full max-w-md rounded bg-[var(--surface)]" />
              <div className="h-3 w-full max-w-sm rounded bg-[var(--surface)]" />
            </div>

            <div className="space-y-2.5">
              <div className="h-3 w-full rounded bg-[var(--surface)]" />
              <div className="h-3 w-full rounded bg-[var(--surface)]" />
              <div className="h-3 w-4/5 rounded bg-[var(--surface)]" />
            </div>
          </div>

          <div className="space-y-4 lg:pt-[4.5rem]">
            <div className="selaura-surface h-[74px] rounded-xl bg-[var(--surface)] p-4" />
            <div className="selaura-surface h-32 rounded-xl bg-[var(--surface)] p-4" />
            <div className="selaura-surface h-20 rounded-xl bg-[var(--surface)] p-4" />
          </div>
        </div>
      </div>
    </main>
  );
}
