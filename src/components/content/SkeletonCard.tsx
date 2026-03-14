// ─── Skeleton card ────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden border border-border animate-pulse">
      <div className="h-40 sm:h-44 bg-muted" />
      <div className="p-4 sm:p-6 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 bg-muted rounded-full w-24" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="pt-2 border-t border-border flex justify-between">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-3 bg-muted rounded w-10" />
        </div>
      </div>
    </div>
  );
}