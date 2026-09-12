export default function LoadingSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="space-y-3">
        <div className="h-6 w-40 bg-zinc-800 rounded" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-6 w-24 bg-zinc-800 rounded" />
        <div className="h-72 bg-zinc-900 rounded-xl" />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-900 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
