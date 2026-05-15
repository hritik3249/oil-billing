// Reusable skeleton shimmer components

const shimmer = 'animate-pulse bg-gray-200 rounded-xl'

export function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${shimmer} ${w} ${h}`} />
}

export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 space-y-3">{children}</div>
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine w="w-32" h="h-8" />
        <SkeletonLine w="w-28" h="h-10" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonLine w="w-20" h="h-3" />
            <SkeletonLine w="w-28" h="h-7" />
          </SkeletonCard>
        ))}
      </div>
      {/* Chart */}
      <SkeletonCard>
        <SkeletonLine w="w-48" h="h-5" />
        <div className={`${shimmer} w-full h-48`} />
      </SkeletonCard>
      {/* Recent bills */}
      <SkeletonCard>
        <SkeletonLine w="w-32" h="h-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="space-y-1.5">
              <SkeletonLine w="w-32" h="h-4" />
              <SkeletonLine w="w-24" h="h-3" />
            </div>
            <SkeletonLine w="w-20" h="h-5" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}

export function BillsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine w="w-20" h="h-8" />
        <SkeletonLine w="w-24" h="h-10" />
      </div>
      <SkeletonCard>
        <SkeletonLine w="w-full" h="h-10" />
        <div className="flex gap-2">
          <SkeletonLine w="w-full" h="h-10" />
          <SkeletonLine w="w-full" h="h-10" />
        </div>
      </SkeletonCard>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <SkeletonLine w="w-40" h="h-4" />
            <SkeletonLine w="w-56" h="h-3" />
          </div>
          <div className="space-y-1.5 text-right">
            <SkeletonLine w="w-20" h="h-5" />
            <SkeletonLine w="w-16" h="h-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine w="w-32" h="h-8" />
        <SkeletonLine w="w-24" h="h-10" />
      </div>
      <SkeletonCard>
        <SkeletonLine w="w-full" h="h-10" />
      </SkeletonCard>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <SkeletonLine w="w-36" h="h-5" />
            <SkeletonLine w="w-48" h="h-3" />
          </div>
          <div className="flex gap-2">
            <div className={`${shimmer} w-9 h-9`} />
            <div className={`${shimmer} w-9 h-9`} />
          </div>
        </div>
      ))}
    </div>
  )
}
