// Lives in the (listing) route group on purpose: at the segment root it also
// wrapped [slug] in Suspense, so detail pages streamed and notFound() was sent
// (and cached by ISR) as a 200 "soft 404" instead of a real 404.
// app/news/loading.tsx  (copy to /blogs/loading.tsx and /entrechat/loading.tsx)
// Next.js shows this INSTANTLY while the server page is building.
// Users see a skeleton instead of a blank white screen.

export default function ContentPageLoading() {
  return (
    <main className="bg-background min-h-screen">
      {/* Banner skeleton */}
      <div className="h-[470px] bg-muted animate-pulse mt-24" />

      {/* Featured + sidebar skeleton */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/30">
        <div className="max-w-screen-xl mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[500px] rounded-3xl bg-muted animate-pulse" />
          <div className="h-[400px] rounded-3xl bg-muted animate-pulse" />
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-screen-xl mx-auto">
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse" style={{ height: 280, animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}