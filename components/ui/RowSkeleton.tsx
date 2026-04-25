export function RowSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="w-40 h-5 skeleton rounded-lg mb-4" />
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-40 flex-shrink-0">
              <div className="aspect-[2/3] skeleton rounded-xl" />
              <div className="mt-2 h-3 w-3/4 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HeroSkeleton() {
  return <div className="h-[85vh] skeleton" />
}

export function CardSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] skeleton rounded-xl" />
      <div className="mt-2 h-3 w-3/4 skeleton rounded" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-[60vh] skeleton" />
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        <div className="h-10 w-64 skeleton rounded-xl" />
        <div className="h-4 w-40 skeleton rounded" />
        <div className="space-y-2">
          <div className="h-4 skeleton rounded" />
          <div className="h-4 skeleton rounded" />
          <div className="h-4 w-2/3 skeleton rounded" />
        </div>
      </div>
    </div>
  )
}
