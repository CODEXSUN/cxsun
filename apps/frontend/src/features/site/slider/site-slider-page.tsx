import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, Copy, Eye, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListTableCard,
  MasterListToolbarCard,
} from "src/components/blocks/lists/master-list"
import { FullScreenSlider } from "src/components/blocks/slider/FullScreenSlider"
import type { BackgroundMode, HighlightVariant, Intensity, SliderItem, VariantType } from "src/components/blocks/slider/slider.types"
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
type SlideKey = "titleStyle" | "taglineStyle" | "badgeStyle" | "buttonStyle"

const statusOptions: Array<{ label: string; value: SiteSliderStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
]

const yesNoOptions = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
const directionOptions = ["fade", "left", "right"] as const
const backgroundModeOptions: BackgroundMode[] = ["normal", "cinematic", "parallax", "3d"]
const intensityOptions: Intensity[] = ["low", "medium", "high"]
const variantOptions: VariantType[] = ["saas", "classic", "luxury", "industrial", "cinematic"]
const badgeVariantOptions: HighlightVariant[] = ["glass", "primary", "secondary", "success", "warning", "danger"]
const buttonSizeOptions = ["sm", "md", "lg"] as const

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
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/50">
              <tr><Header>Name</Header><Header>Placement</Header><Header>Status</Header><Header>Primary</Header><Header>Slides</Header><Header>Order</Header><Header className="text-right">Actions</Header></tr>
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
                  <td className="px-3 py-2">{slider.is_primary ? <Badge className="h-6 rounded-md">Primary</Badge> : <span className="text-muted-foreground">No</span>}</td>
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
            <p className="text-sm text-muted-foreground">{slider.slug} / {slider.placement} / {slider.slides.length} slides</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-md" variant="outline" onClick={onEdit} type="button">Edit</Button>
          <Button className="rounded-md" variant="outline" onClick={onDelete} type="button"><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>
      <Card className="overflow-hidden rounded-md py-0">
        <FullScreenSlider className="h-[460px] min-h-[460px]" slides={slider.slides} options={slider.options} />
      </Card>
    </main>
  )
}

function SiteSliderUpsertPage({ isSaving, onBack, onSubmit, slider }: { isSaving: boolean; onBack(): void; onSubmit(input: SiteSliderInput): void; slider: SiteSlider | null }) {
  const [draft, setDraft] = useState<SiteSliderInput>(() => slider ? { ...slider } : emptySiteSlider())
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const slides = Array.isArray(draft.slides) ? draft.slides : []
  const activeSlide = slides[activeSlideIndex] ?? slides[0] ?? newSlide(1)

  function setRoot(patch: Partial<SiteSliderInput>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function setSlide(index: number, patch: Partial<SliderItem>) {
    setDraft((current) => {
      const nextSlides = [...(current.slides ?? [])]
      nextSlides[index] = { ...nextSlides[index], ...patch } as SliderItem
      return { ...current, slides: nextSlides }
    })
  }

  function setSlideStyle(index: number, key: SlideKey, patch: Record<string, string>) {
    setDraft((current) => {
      const nextSlides = [...(current.slides ?? [])]
      const slide = nextSlides[index] ?? newSlide(index + 1)
      nextSlides[index] = { ...slide, [key]: { ...(slide[key] ?? {}), ...patch } } as SliderItem
      return { ...current, slides: nextSlides }
    })
  }

  function addSlide(copyFrom?: SliderItem) {
    const next = copyFrom ? { ...copyFrom, id: slides.length + 1, title: `${copyFrom.title} copy` } : newSlide(slides.length + 1)
    setRoot({ slides: [...slides, next] })
    setActiveSlideIndex(slides.length)
  }

  function removeSlide(index: number) {
    const nextSlides = slides.filter((_, itemIndex) => itemIndex !== index)
    setRoot({ slides: nextSlides.length ? nextSlides : [newSlide(1)] })
    setActiveSlideIndex(Math.max(0, index - 1))
  }

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1280px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex items-start gap-3">
        <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{slider ? "Edit slider" : "New slider"}</h1>
          <p className="text-sm text-muted-foreground">Create slider roots and design each slide with editable controls.</p>
        </div>
      </div>

      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="text-base">Slider root</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr_150px]">
            <Field label="Name *" value={draft.name ?? ""} onChange={(name) => setRoot({ name, slug: draft.slug || slugValue(name) })} />
            <Field label="Slug" value={draft.slug ?? ""} onChange={(slug) => setRoot({ slug })} placeholder="home-slider-1" />
            <Field label="Placement" value={draft.placement ?? "home-slider"} onChange={(placement) => setRoot({ placement })} />
            <SelectField label="Status" value={draft.status ?? "draft"} options={statusOptions} onChange={(status) => setRoot({ status: status as SiteSliderStatus })} />
          </div>
          <div className="grid gap-4 md:grid-cols-[150px_180px_repeat(4,1fr)]">
            <Field label="Sort order" type="number" value={String(draft.sort_order ?? 1)} onChange={(sortOrder) => setRoot({ sort_order: Number(sortOrder || 1) })} />
            <SwitchRow checked={Boolean(draft.is_primary)} label="Primary slider" onChange={(is_primary) => setRoot({ is_primary })} />
            <SelectField label="Parallax" value={draft.options?.parallax === false ? "no" : "yes"} options={yesNoOptions} onChange={(value) => setRoot({ options: { ...draft.options, parallax: value === "yes" } })} />
            <SimpleSelect label="Default mode" value={draft.options?.defaultBackgroundMode ?? "cinematic"} options={backgroundModeOptions} onChange={(defaultBackgroundMode) => setRoot({ options: { ...draft.options, defaultBackgroundMode } })} />
            <SimpleSelect label="Default intensity" value={draft.options?.defaultIntensity ?? "medium"} options={intensityOptions} onChange={(defaultIntensity) => setRoot({ options: { ...draft.options, defaultIntensity } })} />
            <SimpleSelect label="Default variant" value={draft.options?.defaultVariant ?? "saas"} options={variantOptions} onChange={(defaultVariant) => setRoot({ options: { ...draft.options, defaultVariant } })} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="rounded-md">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Slides</CardTitle>
            <Button className="h-8 rounded-md" size="sm" type="button" onClick={() => addSlide()}><Plus className="size-4" />Add</Button>
          </CardHeader>
          <CardContent className="grid gap-2">
            {slides.map((slide, index) => (
              <button
                className={cn("rounded-md border px-3 py-2 text-left transition", index === activeSlideIndex ? "border-primary bg-primary/5" : "border-border/70 hover:bg-muted/50")}
                key={`${slide.id}-${index}`}
                onClick={() => setActiveSlideIndex(index)}
                type="button"
              >
                <span className="block font-semibold">{slide.title || `Slider ${index + 1}`}</span>
                <span className="block text-xs text-muted-foreground">{slide.action?.text || "No button"} / {slide.media?.type || "image"}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Slide designer</CardTitle>
              <p className="text-sm text-muted-foreground">Slide {activeSlideIndex + 1} of {slides.length}</p>
            </div>
            <div className="flex gap-2">
              <Button className="h-8 rounded-md" size="sm" type="button" variant="outline" onClick={() => addSlide(activeSlide)}><Copy className="size-4" />Copy</Button>
              <Button className="h-8 rounded-md" size="sm" type="button" variant="outline" onClick={() => removeSlide(activeSlideIndex)}><Trash2 className="size-4" />Remove</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="overflow-hidden rounded-md border">
              <FullScreenSlider className="h-[360px] min-h-[360px]" slides={[activeSlide]} options={draft.options} />
            </div>

            <SectionTitle>Content</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Background image" value={activeSlide.media?.type === "image" ? activeSlide.media.src : ""} onChange={(src) => setSlide(activeSlideIndex, { media: { type: "image", src } })} />
              <Field label="Title" value={activeSlide.title} onChange={(title) => setSlide(activeSlideIndex, { title })} />
              <Field label="Tagline" value={activeSlide.tagline} onChange={(tagline) => setSlide(activeSlideIndex, { tagline })} />
              <Field label="Badges" value={(activeSlide.highlights ?? []).map((item) => item.text).join(", ")} onChange={(value) => setSlide(activeSlideIndex, { highlights: value.split(",").map((text) => text.trim()).filter(Boolean).map((text) => ({ text, variant: activeSlide.highlights?.[0]?.variant ?? "glass" })) })} />
              <Field label="Button text" value={activeSlide.action?.text ?? ""} onChange={(text) => setSlide(activeSlideIndex, { action: { text, href: activeSlide.action?.href ?? "/" } })} />
              <Field label="Button link" value={activeSlide.action?.href ?? ""} onChange={(href) => setSlide(activeSlideIndex, { action: { text: activeSlide.action?.text ?? "Open", href } })} />
            </div>

            <SectionTitle>Text Style</SectionTitle>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Title colour" value={activeSlide.titleStyle?.color ?? ""} onChange={(color) => setSlideStyle(activeSlideIndex, "titleStyle", { color })} placeholder="#ffffff" />
              <Field label="Title size" value={activeSlide.titleStyle?.fontSize ?? ""} onChange={(fontSize) => setSlideStyle(activeSlideIndex, "titleStyle", { fontSize })} placeholder="4rem" />
              <Field label="Title font" value={activeSlide.titleStyle?.fontFamily ?? ""} onChange={(fontFamily) => setSlideStyle(activeSlideIndex, "titleStyle", { fontFamily })} placeholder="Inter" />
              <Field label="Title weight" value={activeSlide.titleStyle?.fontWeight ?? ""} onChange={(fontWeight) => setSlideStyle(activeSlideIndex, "titleStyle", { fontWeight })} placeholder="700" />
              <Field label="Tagline colour" value={activeSlide.taglineStyle?.color ?? ""} onChange={(color) => setSlideStyle(activeSlideIndex, "taglineStyle", { color })} placeholder="#e5e7eb" />
              <Field label="Tagline size" value={activeSlide.taglineStyle?.fontSize ?? ""} onChange={(fontSize) => setSlideStyle(activeSlideIndex, "taglineStyle", { fontSize })} placeholder="1.25rem" />
              <Field label="Tagline font" value={activeSlide.taglineStyle?.fontFamily ?? ""} onChange={(fontFamily) => setSlideStyle(activeSlideIndex, "taglineStyle", { fontFamily })} placeholder="Inter" />
              <Field label="Tagline weight" value={activeSlide.taglineStyle?.fontWeight ?? ""} onChange={(fontWeight) => setSlideStyle(activeSlideIndex, "taglineStyle", { fontWeight })} placeholder="400" />
            </div>

            <SectionTitle>Badge And Button Style</SectionTitle>
            <div className="grid gap-4 md:grid-cols-4">
              <SimpleSelect label="Badge type" value={activeSlide.highlights?.[0]?.variant ?? "glass"} options={badgeVariantOptions} onChange={(variant) => setSlide(activeSlideIndex, { highlights: (activeSlide.highlights ?? []).map((item) => ({ ...item, variant })) })} />
              <Field label="Badge text colour" value={activeSlide.badgeStyle?.color ?? ""} onChange={(color) => setSlideStyle(activeSlideIndex, "badgeStyle", { color })} />
              <Field label="Badge background" value={activeSlide.badgeStyle?.backgroundColor ?? ""} onChange={(backgroundColor) => setSlideStyle(activeSlideIndex, "badgeStyle", { backgroundColor })} />
              <Field label="Badge border" value={activeSlide.badgeStyle?.borderColor ?? ""} onChange={(borderColor) => setSlideStyle(activeSlideIndex, "badgeStyle", { borderColor })} />
              <SimpleSelect label="Button size" value={activeSlide.buttonStyle?.size ?? "md"} options={buttonSizeOptions} onChange={(size) => setSlideStyle(activeSlideIndex, "buttonStyle", { size })} />
              <Field label="Button text colour" value={activeSlide.buttonStyle?.color ?? ""} onChange={(color) => setSlideStyle(activeSlideIndex, "buttonStyle", { color })} />
              <Field label="Button background" value={activeSlide.buttonStyle?.backgroundColor ?? ""} onChange={(backgroundColor) => setSlideStyle(activeSlideIndex, "buttonStyle", { backgroundColor })} />
              <Field label="Button border" value={activeSlide.buttonStyle?.borderColor ?? ""} onChange={(borderColor) => setSlideStyle(activeSlideIndex, "buttonStyle", { borderColor })} />
              <Field label="Button radius" value={activeSlide.buttonStyle?.borderRadius ?? ""} onChange={(borderRadius) => setSlideStyle(activeSlideIndex, "buttonStyle", { borderRadius })} placeholder="0.5rem" />
              <Field label="Button font size" value={activeSlide.buttonStyle?.fontSize ?? ""} onChange={(fontSize) => setSlideStyle(activeSlideIndex, "buttonStyle", { fontSize })} />
              <Field label="Button font" value={activeSlide.buttonStyle?.fontFamily ?? ""} onChange={(fontFamily) => setSlideStyle(activeSlideIndex, "buttonStyle", { fontFamily })} />
              <Field label="Icon size" value={activeSlide.buttonStyle?.iconSize ?? ""} onChange={(iconSize) => setSlideStyle(activeSlideIndex, "buttonStyle", { iconSize })} placeholder="1.25rem" />
            </div>

            <SectionTitle>Motion And Overlay</SectionTitle>
            <div className="grid gap-4 md:grid-cols-4">
              <SimpleSelect label="Direction" value={activeSlide.direction ?? "fade"} options={directionOptions} onChange={(direction) => setSlide(activeSlideIndex, { direction })} />
              <SimpleSelect label="Background mode" value={activeSlide.backgroundMode ?? "cinematic"} options={backgroundModeOptions} onChange={(backgroundMode) => setSlide(activeSlideIndex, { backgroundMode })} />
              <SimpleSelect label="Intensity" value={activeSlide.intensity ?? "medium"} options={intensityOptions} onChange={(intensity) => setSlide(activeSlideIndex, { intensity })} />
              <Field label="Duration ms" type="number" value={String(activeSlide.duration ?? 6000)} onChange={(duration) => setSlide(activeSlideIndex, { duration: Number(duration || 6000) })} />
              <SelectField label="Overlay" value={activeSlide.showOverlay === false ? "no" : "yes"} options={yesNoOptions} onChange={(value) => setSlide(activeSlideIndex, { showOverlay: value === "yes" })} />
              <Field label="Overlay class" value={activeSlide.overlayColor ?? ""} onChange={(overlayColor) => setSlide(activeSlideIndex, { overlayColor })} placeholder="bg-gradient-to-r from-black/85..." />
            </div>

            <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
              <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>Back</Button>
              <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit({ ...draft, slides })}><Save className={cn("size-4", isSaving && "animate-spin")} />Save slider</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function newSlide(id: number): SliderItem {
  return {
    id,
    title: `Slider ${id}`,
    tagline: "Write the tagline for this slide.",
    action: { text: "Open", href: "/" },
    media: { type: "image", src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80" },
    highlights: [{ text: "Badge", variant: "glass" }],
    titleStyle: { color: "#ffffff", fontWeight: "700" },
    taglineStyle: { color: "#e5e7eb", fontWeight: "400" },
    badgeStyle: { color: "#ffffff", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.24)", fontWeight: "600" },
    buttonStyle: { color: "#111827", backgroundColor: "#ffffff", borderColor: "#ffffff", borderRadius: "0.5rem", fontWeight: "700", iconSize: "1.25rem", size: "md" },
    ctaColor: "light",
    duration: 6000,
    direction: "fade",
    backgroundMode: "cinematic",
    intensity: "medium",
    overlayColor: "bg-gradient-to-r from-black/85 via-black/55 to-black/10",
  }
}

function StatusBadge({ status }: { status: SiteSliderStatus }) {
  return <Badge variant="outline" className={cn("h-6 rounded-md px-2 text-[11px]", status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>{status}</Badge>
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border/70 pb-2 text-sm font-semibold text-muted-foreground">{children}</div>
}

function Field({ label, onChange, placeholder, type = "text", value }: { label: string; onChange(value: string): void; placeholder?: string; type?: string; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-11 rounded-md" placeholder={placeholder} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: Array<{ value: string; label: string }>; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 min-h-11 rounded-md"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

function SimpleSelect<TValue extends string>({ label, onChange, options, value }: { label: string; onChange(value: TValue): void; options: readonly TValue[]; value: TValue }) {
  return <SelectField label={label} value={value} options={options.map((option) => ({ label: option, value: option }))} onChange={(nextValue) => onChange(nextValue as TValue)} />
}

function SwitchRow({ checked, label, onChange }: { checked: boolean; label: string; onChange(value: boolean): void }) {
  return (
    <div className="grid gap-2">
      <span aria-hidden className="h-5" />
      <label className={cn("flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 text-sm font-medium", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
        {label}
        <Switch checked={checked} onCheckedChange={onChange} />
      </label>
    </div>
  )
}

function slugValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120)
}
