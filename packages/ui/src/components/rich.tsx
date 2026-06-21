import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../lib/utils"

export function UiPanel({
  body,
  children,
  className,
  eyebrow = "Workspace",
  title,
}: {
  body?: string
  children: ReactNode
  className?: string
  eyebrow?: string
  title: string
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="mb-5">
        <small className="text-xs font-black uppercase tracking-[0.13em] text-sky-600">{eyebrow}</small>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2>
        {body ? <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function UiStatCard({
  icon: Icon,
  label,
  tone = "blue",
  value,
}: {
  icon?: LucideIcon
  label: string
  tone?: "blue" | "emerald" | "orange" | "violet" | "slate"
  value: ReactNode
}) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone]
  return (
    <article className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {Icon ? <span className={cn("flex size-11 items-center justify-center rounded-lg", toneClass)}><Icon size={21} /></span> : null}
      <span><strong className="block text-2xl text-slate-950">{value}</strong><small className="text-sm text-slate-500">{label}</small></span>
    </article>
  )
}

export function UiEmptyState({ children = "No records found." }: { children?: ReactNode }) {
  return <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">{children}</div>
}

export function UiSimpleTable<T extends Record<string, unknown>>({
  action,
  columns,
  rows,
}: {
  action?: (row: T) => ReactNode
  columns: string[]
  rows: T[]
}) {
  if (!rows.length) return <UiEmptyState />
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-[760px] w-full border-collapse">
        <thead>
          <tr>{columns.map((column) => <th className="bg-slate-50 p-3 text-left text-xs font-black uppercase tracking-wider text-slate-500" key={column}>{column.replaceAll("_", " ")}</th>)}{action ? <th className="bg-slate-50 p-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Action</th> : null}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={String(row.uuid ?? index)}>{columns.map((column) => <td className="border-t border-slate-100 p-3 text-sm text-slate-700" key={column}>{cell(row[column])}</td>)}{action ? <td className="border-t border-slate-100 p-3">{action(row)}</td> : null}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

function cell(value: unknown) {
  if (value == null) return "—"
  if (typeof value === "string" && value.length > 80) return `${value.slice(0, 80)}...`
  return String(value).replaceAll("_", " ")
}
