import { useEffect, useMemo, useState } from "react"
import { Check, Plus } from "lucide-react"

import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import type { MasterDataRecord, MasterDataUpsertInput } from "src/features/master-data/domain/master-data"

export function PriorityAutocomplete({
  isCreating,
  label,
  onChange,
  onCreate,
  priorities,
  value,
}: {
  isCreating: boolean
  label: string
  onChange(value: string): void
  onCreate(input: MasterDataUpsertInput): Promise<MasterDataRecord>
  priorities: MasterDataRecord[]
  value: string
}) {
  const selected = useMemo(() => findPriority(priorities, value), [priorities, value])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(() => priorityName(selected, value))
  const normalizedQuery = query.trim().toLowerCase()
  const filteredPriorities = priorities.filter((priority) => {
    return priorityName(priority, "").toLowerCase().includes(normalizedQuery) || priorityTag(priority).includes(normalizedQuery)
  })
  const exactPriority = priorities.find((priority) => {
    return priorityName(priority, "").toLowerCase() === normalizedQuery || priorityTag(priority) === toTag(query)
  })
  const canCreate = Boolean(normalizedQuery && !exactPriority && !isCreating)

  useEffect(() => {
    if (!isOpen) setQuery(priorityName(selected, value))
  }, [isOpen, selected, value])

  function select(priority: MasterDataRecord) {
    onChange(priorityTag(priority))
    setQuery(priorityName(priority, priorityTag(priority)))
    setIsOpen(false)
  }

  async function fastCreate() {
    const name = query.trim()
    const tag = toTag(name)
    if (!name || !tag || exactPriority) return
    const created = await onCreate({ name, tag, colour: randomPriorityColour(), is_active: true })
    select(created)
  }

  return (
    <div className="relative grid gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <PriorityDot colour={priorityColour(selected)} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="h-11 rounded-md pl-9"
          disabled={isCreating}
          placeholder="Type priority"
          role="combobox"
          value={query}
          onBlur={() => window.setTimeout(() => {
            setIsOpen(false)
            if (exactPriority) select(exactPriority)
          }, 120)}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            setIsOpen(true)
            const exact = priorities.find((priority) => priorityName(priority, "").toLowerCase() === nextQuery.trim().toLowerCase() || priorityTag(priority) === toTag(nextQuery))
            if (exact) onChange(priorityTag(exact))
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (exactPriority) select(exactPriority)
            else if (filteredPriorities[0]) select(filteredPriorities[0])
            else if (canCreate) void fastCreate()
          }}
        />
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {filteredPriorities.map((priority) => {
            const tag = priorityTag(priority)
            return (
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" key={priority.uuid} onMouseDown={(event) => { event.preventDefault(); select(priority) }} type="button">
                <PriorityDot colour={priorityColour(priority)} />
                <span className="min-w-0 flex-1 truncate">{priorityName(priority, tag)}</span>
                <span className="text-xs text-muted-foreground">{tag}</span>
                {tag === value ? <Check className="size-4 text-primary" /> : <span className="size-4" />}
              </button>
            )
          })}
          {canCreate ? (
            <button className="flex w-full items-center gap-2 rounded-md border-t border-border/70 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); void fastCreate() }} type="button">
              <Plus className="size-4" />
              Create "{query.trim()}"
            </button>
          ) : null}
          {!filteredPriorities.length && !canCreate ? <div className="px-3 py-2 text-sm text-muted-foreground">No priorities found.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

export function PriorityBadge({ priorities, value }: { priorities: MasterDataRecord[]; value: string }) {
  const priority = findPriority(priorities, value)
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-md border border-border/70 bg-card px-2 text-xs font-medium">
      <PriorityDot colour={priorityColour(priority)} />
      {priorityName(priority, value)}
    </span>
  )
}

function PriorityDot({ className = "", colour }: { className?: string; colour: string }) {
  return <span className={`size-2.5 shrink-0 rounded-full ring-1 ring-black/10 ${className}`} style={{ backgroundColor: colour }} />
}

function findPriority(priorities: MasterDataRecord[], value: string) {
  return priorities.find((priority) => priorityTag(priority) === value) ?? null
}

function priorityName(priority: MasterDataRecord | null, fallback: string) {
  return String(priority?.name ?? fallback ?? "Normal")
}

function priorityColour(priority: MasterDataRecord | null) {
  return String(priority?.colour ?? "#64748b")
}

function priorityTag(priority: MasterDataRecord) {
  return String(priority.tag ?? priority.name ?? "normal").trim().toLowerCase()
}

function toTag(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function randomPriorityColour() {
  const colours = ["#0ea5e9", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#22c55e", "#eab308", "#ef4444", "#6366f1"]
  return colours[Math.floor(Math.random() * colours.length)]
}
