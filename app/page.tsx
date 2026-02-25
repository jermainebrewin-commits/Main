/**
 * Root page — placeholder until all phases are complete.
 * Will be replaced with the main dashboard in a later phase.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Fintech Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Phase 1 complete — schema, fiscal utilities, and seed data are ready.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <a
            href="/wealth"
            className="rounded-md border px-4 py-2 hover:bg-accent transition-colors"
          >
            /wealth →
          </a>
          <a
            href="/optimization"
            className="rounded-md border px-4 py-2 hover:bg-accent transition-colors"
          >
            /optimization →
          </a>
          <a
            href="/review"
            className="rounded-md border px-4 py-2 hover:bg-accent transition-colors col-span-2"
          >
            /review →
          </a>
        </div>
      </div>
    </main>
  );
}
