import { Skeleton } from "src/components/ui/skeleton"
import { cn } from "src/lib/utils"

export function ModuleListSkeleton({ columns = 6, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="grid gap-0 border-t border-border/70">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="grid min-h-11 gap-3 border-b border-border/60 px-4 py-2.5" key={rowIndex} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton className={cn("h-4", columnIndex === 0 ? "w-24" : columnIndex === columns - 1 ? "ml-auto w-16" : "w-full")} key={columnIndex} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ModuleReportSkeleton({ cards = 4, rows = 5 }: { cards?: number; rows?: number }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div className="rounded-md border border-border/70 px-3 py-2" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border/70">
        <ModuleListSkeleton columns={5} rows={rows} />
      </div>
    </div>
  )
}
