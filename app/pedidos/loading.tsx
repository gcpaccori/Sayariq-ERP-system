import { Skeleton } from "@/components/ui/skeleton"

export default function PedidosLoading() {
  return (
    <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 lg:h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 w-full max-w-md" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16" />
          ))}
        </div>
      </div>

      <Skeleton className="h-64 w-full" />
    </div>
  )
}
