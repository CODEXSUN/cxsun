import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, Eye, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListTableCard,
  MasterListToolbarCard,
} from "src/components/blocks/lists/master-list"
import { FullScreenSlider } from "src/components/blocks/slider/FullScreenSlider"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  deleteSiteSlider,
  emptySiteSlider,
  listSiteSliders,
  upsertSiteSlider,
  type SiteSlider,
  type SiteSliderInput,
  type SiteSliderStatus,
} from "./site-slider-client"

type View = { mode: "list" } | { mode: "show"; slider: SiteSlider } | { mode: "upsert"; slider: SiteSlider | null }

const statusOptions: Array<{ label: string; value: SiteSliderStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
]

export function SiteSliderPage({ session }: { session: AuthSession }) {
  const [view, setView] = useState<View>({ mode: "list" })
  const [search, setSearch] = useState("")
  const query = useQuery({ queryKey: ["site-sliders", session.selectedTenant.slug], queryFn: () => listSiteSliders(session) })
  const saveMutation = useMutation({ mutationFn: (input: SiteSliderInput) => upsertSiteSlider(session, input) })
  const deleteMutation = useMutation({ mutationFn: (slider: SiteSlider) => deleteSiteSlider(session, slider) })
  const sliders = query.data ?? []
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sliders.filter((slider) => !term || [slider.name, slider.slug, slider.placement, slider.status].some((value) => value.toLowerCase().includes(term)))
  }, [search, sliders])

  async function refresh() {
    await query.refetch()
  }

  async function save(input: SiteSliderInput) {
    const slider = await saveMutation.mutateAsync(input)
    toast.success(input.uuid ? "Slider updated" : "Slider created", { description: slider.name })
    await refresh()
    setView({ mode: "show", slider })
  }

  async function destroy(slider: SiteSlider) {
    await deleteMutation.mutateAsync(slider)
    toast.error("Slider deleted", { description: slider.name })
    await refresh()
    setView({ mode: "list" })
  }

  if (view.mode === "show") {
    const slider = sliders.find((item) => item.uuid === view.slider.uuid) ?? view.slider
    return <SiteSliderShowPage slider={slider} onBack={() => setView({ mode: "list" })} onDelete={() => void destroy(slider)} onEdit={() => setView({ mode: "upsert", slider })} />
  }

  if (view.mode === "upsert") {
    return <SiteSliderUpsertPage isSaving={saveMutation.isPending} slider={view.slider} onBack={() => setView(view.slider ? { mode: "show", slider: view.slider } : { mode: "list" })} onSubmit={save} />
  }

  return (
    <MasterListPageFrame
      title="Site Sliders"
      description="Manage tenant-owned public sliders for the Site app."
      technicalName="page.site.sliders.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={query.isFetching} onClick={() => void refresh()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setView({ mode: "upsert", slider: null })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New slider</Button>
        </div>
      }
    >
      <MasterListToolbarCard searchPlaceholder="Search sliders" searchValue={search} onSearchValueChange={setSearch} />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50">
              <tr><Header>Name</Header><Header>Placement</Header><Header>Status</Header><Header>Slides</Header><Header>Order</Header><Header className="text-right">Actions</Header></tr>
            </thead>
            <tbody>
              {filtered.map((slider) => (
                <tr key={slider.uuid} className="border-t border-border/70">
                  <td className="px-3 py-2">
                    <button className="font-semibold hover:underline" onClick={() => setView({ mode: "show", slider })} type="button">{slider.name}</button>
                    <div className="text-xs text-muted-foreground">{slider.slug}</div>
                  </td>
                  <td className="px-3 py-2">{slider.placement}</td>
                  <td className="px-3 py-2"><StatusBadge status={slider.status} /></td>
                  <td className="px-3 py-2">{slider.slides.length}</td>
                  <td className="px-3 py-2">{slider.sort_order}</td>
                  <td className="px-3 py-2 text-right">
                    <Button className="h-8 rounded-md" variant="outline" onClick={() => setView({ mode: "show", slider })} type="button"><Eye className="size-4" />View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? <MasterListEmptyState>{query.isFetching ? "Loading sliders." : "No sliders found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
    </MasterListPageFrame>
  )
}

function SiteSliderShowPage({ onBack, onDelete, onEdit, slider }: { onBack(): void; onDelete(): void; onEdit(): void; slider: SiteSlider }) {
  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1280px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{slider.name}</h1>
            <p className="text-sm text-muted-foreground">{slider.slug} / {slider.placement}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-md" variant="outline" onClick={onEdit} type="button">Edit</Button>
          <Button className="rounded-md" variant="outline" onClick={onDelete} type="button"><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>
      <Card className="overflow-hidden rounded-md py-0">
        <div className="max-h-[620px] overflow-hidden">
          <FullScreenSlider slides={slider.slides} options={slider.options} />
        </div>
      </Card>
    </main>
  )
}

function SiteSliderUpsertPage({ isSaving, onBack, onSubmit, slider }: { isSaving: boolean; onBack(): void; onSubmit(input: SiteSliderInput): void; slider: SiteSlider | null }) {
  const [draft, setDraft] = useState<SiteSliderInput>(() => slider ? { ...slider } : emptySiteSlider())

  function updateJson<T>(key: "options" | "slides", value: string) {
    try {
      setDraft((current) => ({ ...current, [key]: JSON.parse(value) as T }))
    } catch {
      setDraft((current) => ({ ...current, [key]: value as never }))
    }
  }

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex items-start gap-3">
        <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{slider ? "Edit slider" : "New slider"}</h1>
          <p className="text-sm text-muted-foreground">Set all slider fields for tenant public Site pages.</p>
        </div>
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="text-base">Slider details</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_160px]">
            <Field label="Name *" value={draft.name ?? ""} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
            <Field label="Slug" value={draft.slug ?? ""} onChange={(value) => setDraft((current) => ({ ...current, slug: value }))} />
            <Field label="Placement" value={draft.placement ?? "home-slider"} onChange={(value) => setDraft((current) => ({ ...current, placement: value }))} />
            <SelectField label="Status" value={draft.status ?? "draft"} onChange={(value) => setDraft((current) => ({ ...current, status: value as SiteSliderStatus }))} />
          </div>
          <Field label="Sort order" type="number" value={String(draft.sort_order ?? 1)} onChange={(value) => setDraft((current) => ({ ...current, sort_order: Number(value || 1) }))} />
          <JsonField label="Options JSON" value={JSON.stringify(draft.options ?? {}, null, 2)} onChange={(value) => updateJson("options", value)} />
          <JsonField label="Slides JSON" value={JSON.stringify(draft.slides ?? [], null, 2)} onChange={(value) => updateJson("slides", value)} />
          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>Back</Button>
            <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit(draft)}><Save className={cn("size-4", isSaving && "animate-spin")} />Save slider</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function StatusBadge({ status }: { status: SiteSliderStatus }) {
  return <Badge variant="outline" className={cn("h-6 rounded-md px-2 text-[11px]", status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>{status}</Badge>
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: string; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-11 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function JsonField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Textarea className="min-h-56 rounded-md font-mono text-xs" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectField({ label, onChange, value }: { label: string; onChange(value: string): void; value: SiteSliderStatus }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 min-h-11 rounded-md"><SelectValue /></SelectTrigger>
        <SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}
