import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, Globe2, Layers3, LifeBuoy, PackageCheck, Plus, ReceiptText, Settings2, ShieldCheck, Sparkles, Store, UserRound, UsersRound, X, Zap } from 'lucide-react'

import { BrandLogo } from 'src/components/blocks/branding/brand-logo'
import { FullScreenSlider } from 'src/components/blocks/slider/FullScreenSlider'
import { APP_NAME } from 'src/lib/branding'
import { SiteSection } from '../developer/site-section'
import type { TenantStaticSiteContent } from '../domain/site-content'
import { ScrollReveal } from '../motion/scroll-reveal'

interface HomePageProps {
  developerMode: boolean
  tenantSite: TenantStaticSiteContent | null
}

export function HomePage({ developerMode, tenantSite }: HomePageProps) {
  const slider =
    tenantSite?.sliders?.find((item) => item.placement === 'home-slider' && item.is_primary) ??
    tenantSite?.sliders?.find((item) => item.placement === 'home-slider') ??
    tenantSite?.sliders?.[0]

  return (
    <main className="overflow-x-clip">
      <SiteSection className="relative" developerMode={developerMode} name={slider ? 'home-slider' : 'home-hero'}>
        {slider ? (
          <FullScreenSlider
            className="h-[calc(100svh-10rem)] max-h-[560px] min-h-[420px]"
            slides={slider.slides}
            options={slider.options}
          />
        ) : (
          <StaticHomeHero tenantName={tenantSite?.tenant?.name ?? APP_NAME} />
        )}
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-brand-intro">
        <ScrollReveal direction="bottom" distance={34}>
          <HomeBrandIntro />
        </ScrollReveal>
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-stats">
        <HomeStatsSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-product-showcase">
        <HomeProductShowcase />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-brand-marquee">
        <HomeBrandMarquee />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-business-templates">
        <HomeBusinessTemplates />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-why">
        <HomeWhySection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-pricing">
        <HomePricingSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-story">
        <HomeStorySection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-values">
        <HomeValuesSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-blogs">
        <HomeBlogsSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-final-cta">
        <HomeFinalCta />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-faq">
        <HomeFaqSection />
      </SiteSection>
    </main>
  )
}

function HomeBrandIntro() {
  return (
    <section className="overflow-hidden bg-[linear-gradient(120deg,rgba(14,165,233,0.08)_0_1px,transparent_1px_42px),linear-gradient(60deg,rgba(245,158,11,0.10)_0_1px,transparent_1px_46px),radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.24),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f0f9ff_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-sky-200 bg-white shadow-xl shadow-sky-950/10">
          <BrandLogo className="size-10" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-700">Codexsun business suite</p>
        <h1 className="mx-auto mt-4 max-w-5xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
          Your business work, powered by software that stays clear.
        </h1>
        <div className="mx-auto mt-6 flex w-fit gap-2">
          <span className="h-1 w-8 rounded-full bg-sky-500" />
          <span className="h-1 w-8 rounded-full bg-amber-400" />
          <span className="h-1 w-8 rounded-full bg-emerald-500" />
        </div>
        <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600">
          Codexsun brings website content, billing, customers, operations, and team access into one calm workspace built for growing businesses.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700" type="button">
            Get started
            <ArrowRight className="size-4" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-800 transition hover:border-slate-500" type="button">
            Explore products
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  )
}

const homeStats = [
  {
    accent: 'text-sky-600',
    description: 'Growing businesses can run their public site and daily work from the same foundation.',
    icon: UsersRound,
    label: 'Clients served',
    suffix: '+',
    value: 120,
  },
  {
    accent: 'text-emerald-600',
    description: 'Website, billing, CRM, tasks, auditor tools, reports, and more can live together.',
    icon: Layers3,
    label: 'Apps connected',
    suffix: '+',
    value: 12,
  },
  {
    accent: 'text-amber-600',
    description: 'Invoices, customer actions, follow-ups, and team tasks move through cleaner flows.',
    icon: CheckCircle2,
    label: 'Work solved',
    suffix: '+',
    value: 10000,
  },
  {
    accent: 'text-blue-600',
    description: 'Business access, brand content, and workspace control stay clear as teams grow.',
    icon: ShieldCheck,
    label: 'Control layer',
    suffix: '%',
    value: 100,
  },
]

function HomeStatsSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] px-4 pb-14 text-slate-950 md:pb-16">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={26}>
          <div className="grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl shadow-slate-950/5 md:grid-cols-4">
            {homeStats.map((stat, index) => (
              <StatCard index={index} key={stat.label} stat={stat} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatCard({ index, stat }: { index: number; stat: typeof homeStats[number] }) {
  const Icon = stat.icon

  return (
    <article className="border-slate-200 p-6 md:border-r md:last:border-r-0">
      <div className={`mb-5 flex size-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 ${stat.accent}`}>
        <Icon className="size-6" />
      </div>
      <p className="flex items-end gap-1 text-4xl font-black leading-none tracking-normal text-slate-950 md:text-5xl">
        <AnimatedCount delay={index * 120} value={stat.value} />
        {stat.suffix ? <span className={`text-2xl font-black ${stat.accent}`}>{stat.suffix}</span> : null}
      </p>
      <h3 className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-700">{stat.label}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{stat.description}</p>
    </article>
  )
}

function AnimatedCount({ delay = 0, duration = 1100, value }: { delay?: number; duration?: number; value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let interval = 0
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        const timestamp = window.performance.now()
        startTime ??= timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const eased = 1 - (1 - progress) ** 3

        setDisplayValue(Math.round(value * eased))

        if (progress >= 1) {
          window.clearInterval(interval)
        }
      }, 16)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [delay, duration, value])

  return <span>{displayValue.toLocaleString('en-IN')}</span>
}

function HomeProductShowcase() {
  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="relative overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-8 pt-16 shadow-xl shadow-slate-950/5 md:px-8 md:pb-10 md:pt-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(90deg,rgba(14,165,233,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(14,165,233,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
            <FloatingMetricCard className="left-[7%] top-10 hidden rotate-[-8deg] lg:block" label="Invoice cycle" value="12.5m" />
            <FloatingMetricCard className="left-[38%] top-5 hidden lg:block" label="Billing check in progress" progress="64%" value="Live review" />
            <FloatingMetricCard className="right-[8%] top-8 hidden rotate-[-7deg] lg:block" label="Work impact" value="432 actions" />

            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
              <div className="grid min-h-[480px] bg-slate-50 md:grid-cols-[72px_1fr]">
                <aside className="hidden border-r border-slate-200 bg-white px-4 py-6 md:block">
                  <BrandLogo className="mb-9 size-10" />
                  <div className="grid justify-items-center gap-6 text-slate-500">
                    {[Globe2, BarChart3, Layers3, ReceiptText, Clock3, UsersRound, Settings2].map((Icon) => (
                      <Icon className="size-5" key={Icon.displayName ?? Icon.name} />
                    ))}
                  </div>
                </aside>

                <div className="p-5 md:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Codexsun workspace</p>
                      <h2 className="mt-2 text-3xl font-black leading-tight tracking-normal md:text-4xl">Business activity analysis</h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        See billing, customer follow-up, storefront activity, and team work from one calm operating view.
                      </p>
                    </div>
                    <div className="flex gap-2 text-sm font-bold text-slate-600">
                      {['Today', 'Week', 'Month'].map((item, index) => (
                        <span className={`rounded-full px-4 py-2 ${index === 0 ? 'bg-slate-950 text-white' : 'bg-white'}`} key={item}>{item}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {[
                      ['5.43K', 'Customer actions'],
                      ['125s', 'Avg response'],
                      ['432', 'Completed tasks'],
                    ].map(([value, label]) => (
                      <div className="rounded-md bg-white p-5 shadow-sm shadow-slate-950/5" key={label}>
                        <p className="text-3xl font-black tracking-normal">{value}</p>
                        <p className="mt-2 text-sm text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-md bg-white p-5 shadow-sm shadow-slate-950/5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black">Data activity</h3>
                          <p className="mt-1 text-sm text-slate-500">Viewing daily business movement</p>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">4 New</span>
                      </div>
                      <div className="grid grid-cols-[1fr_170px] gap-6">
                        <div className="flex h-44 items-end gap-3 border-b border-dashed border-slate-200">
                          {[58, 44, 82, 64, 94, 72].map((height) => (
                            <div className="flex flex-1 flex-col justify-end" key={height}>
                              <span className="rounded-t-md bg-emerald-500" style={{ height: `${height}%` }} />
                              <span className="h-12 bg-slate-100" />
                            </div>
                          ))}
                        </div>
                        <div className="grid content-center gap-6">
                          <div>
                            <p className="text-3xl font-black">5,432</p>
                            <p className="mt-1 text-sm leading-5 text-slate-500">Business events captured</p>
                          </div>
                          <div>
                            <p className="text-3xl font-black">7,957</p>
                            <p className="mt-1 text-sm leading-5 text-slate-500">Actions completed</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md bg-white p-5 shadow-sm shadow-slate-950/5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black">Workflow status</h3>
                          <p className="mt-1 text-sm text-slate-500">Live team progress</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">24 Hours</span>
                      </div>
                      <div className="grid gap-4">
                        {[
                          ['Billing', 58],
                          ['Customer', 82],
                          ['Dispatch', 46],
                          ['Follow-up', 70],
                        ].map(([label, width]) => (
                          <div className="grid grid-cols-[86px_1fr] items-center gap-4" key={label}>
                            <span className="text-sm text-slate-500">{label}</span>
                            <span className="h-9 rounded-md bg-slate-100">
                              <span className="block h-full rounded-md bg-lime-300" style={{ width: `${width}%` }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-10 text-center">
              <p className="text-base font-semibold text-slate-600 md:text-lg">Trusted by growing teams across daily business work</p>
              <div className="mt-7 grid gap-4 text-slate-400 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {implementedBrands.slice(0, 6).map((brand) => (
                  <div className="flex items-center justify-center gap-2 text-lg font-black" key={brand}>
                    <Layers3 className="size-5" />
                    {brand.split(' ')[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function FloatingMetricCard({ className, label, progress, value }: { className?: string; label: string; progress?: string; value: string }) {
  return (
    <div className={`absolute z-10 min-w-[230px] rounded-md border border-slate-100 bg-white/90 p-4 shadow-xl shadow-slate-950/10 backdrop-blur ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span className="text-slate-300">•••</span>
      </div>
      {progress ? (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: progress }} />
          </div>
          <p className="mt-1 text-right text-xs font-black text-slate-500">{progress}</p>
        </div>
      ) : null}
    </div>
  )
}

const implementedBrands = [
  'Codexsun Retail',
  'Sunmart Billing',
  'BluePeak Stores',
  'GreenLedger',
  'PrimeDesk',
  'Nova Commerce',
  'Urban Works',
  'ClearBooks',
  'BrightOps',
  'Northline CRM',
]

function HomeBrandMarquee() {
  const marqueeItems = [...implementedBrands, ...implementedBrands]

  return (
    <section className="bg-white px-4 pb-14 text-slate-950 md:pb-16">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={22}>
          <div className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f0f9ff_100%)] py-7">
            <div className="mb-6 flex flex-col justify-between gap-3 px-6 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Implemented brands</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal md:text-3xl">
                  Teams building their business flow with Codexsun.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                A living brand lane for businesses using Codexsun across website, billing, commerce, and operations.
              </p>
            </div>

            <div className="relative overflow-hidden bg-white/75 py-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />
              <div className="cx-brand-marquee flex w-max gap-4">
                {marqueeItems.map((brand, index) => (
                  <BrandMarqueeItem brand={brand} index={index} key={`${brand}-${index}`} />
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function BrandMarqueeItem({ brand, index }: { brand: string; index: number }) {
  const tones = [
    'border-sky-200 bg-sky-50 text-sky-700',
    'border-emerald-200 bg-emerald-50 text-emerald-700',
    'border-amber-200 bg-amber-50 text-amber-700',
    'border-blue-200 bg-blue-50 text-blue-700',
  ]
  const initials = brand
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="flex min-w-[220px] items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className={`grid size-11 place-items-center rounded-md border text-sm font-black ${tones[index % tones.length]}`}>
        {initials}
      </span>
      <span className="text-base font-black tracking-normal text-slate-900">{brand}</span>
    </div>
  )
}

const businessTemplates = [
  {
    accent: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: ReceiptText,
    visual: 'invoice',
    title: 'GST billing',
    description: 'Create GST-ready invoices with tax details, customer records, and clean billing history in one place.',
  },
  {
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: PackageCheck,
    visual: 'dispatch',
    title: 'E-way bill flow',
    description: 'Prepare transport-ready billing information so dispatch and movement work can stay organized.',
  },
  {
    accent: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: FileText,
    visual: 'einvoice',
    title: 'E-invoice ready',
    description: 'Keep invoice data structured from the beginning, making future e-invoice workflows easier to connect.',
  },
  {
    accent: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Layers3,
    visual: 'ledger',
    title: 'Tally support',
    description: 'Plan accounting handoff clearly, with business records prepared for accountant-friendly review.',
  },
  {
    accent: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: UsersRound,
    visual: 'accountant',
    title: 'Accountant workspace',
    description: 'Give accountants cleaner access to billing, receipts, reports, and review-ready business data.',
  },
  {
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    icon: ShieldCheck,
    visual: 'checks',
    title: 'Accuracy checks',
    description: 'Reduce mistakes with clearer fields, consistent records, and workflows that make missing details easier to spot.',
  },
  {
    accent: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: CheckCircle2,
    visual: 'tasks',
    title: 'Task manager',
    description: 'Turn daily follow-ups into trackable work so teams know what is pending, assigned, and completed.',
  },
  {
    accent: 'border-teal-200 bg-teal-50 text-teal-700',
    icon: Zap,
    visual: 'automation',
    title: 'Automation',
    description: 'Automate repeated business steps gradually, without hiding the status or the next action from the team.',
  },
  {
    accent: 'border-orange-200 bg-orange-50 text-orange-700',
    icon: Clock3,
    visual: 'reminders',
    title: 'Smart reminders',
    description: 'Keep payments, renewals, follow-ups, and customer actions visible before they become urgent.',
  },
]

function HomeBusinessTemplates() {
  return (
    <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-14 text-slate-950 md:pb-16">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={26}>
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Ready workflows</p>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal md:text-4xl">
                Clear workflows clients understand before they start.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">
              Codexsun can present each business area as a simple template: what it does, why it matters, and how it helps daily work stay accountable.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {businessTemplates.map((template, index) => (
            <ScrollReveal delay={index * 0.04} direction="bottom" distance={24} key={template.title}>
              <BusinessTemplateCard template={template} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function BusinessTemplateCard({ template }: { template: typeof businessTemplates[number] }) {
  const Icon = template.icon

  return (
    <article className="h-full min-h-[330px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
      <BusinessTemplateVisual type={template.visual} />
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-md border ${template.accent}`}>
            <Icon className="size-5" />
          </div>
          <h3 className="text-xl font-black tracking-normal text-slate-950">{template.title}</h3>
        </div>
        <p className="text-sm leading-6 text-slate-600">{template.description}</p>
      </div>
    </article>
  )
}

function BusinessTemplateVisual({ type }: { type: string }) {
  if (type === 'invoice' || type === 'einvoice') {
    return (
      <div className="h-32 bg-white/90 p-4 shadow-sm">
        <div className="h-3 w-16 rounded-full bg-sky-500" />
        <div className="mt-4 grid gap-2">
          <span className="h-2 rounded-full bg-slate-200" />
          <span className="h-2 w-4/5 rounded-full bg-slate-200" />
          <span className="mt-2 h-5 w-20 rounded-md bg-slate-900" />
        </div>
      </div>
    )
  }

  if (type === 'dispatch') {
    return (
      <div className="grid h-32 grid-cols-[1fr_52px] gap-3 bg-emerald-50 p-4 shadow-sm">
        <div className="rounded-md bg-white p-3">
          <span className="block h-3 w-20 rounded-full bg-emerald-500" />
          <span className="mt-4 block h-12 rounded-md bg-emerald-100" />
        </div>
        <div className="grid place-items-center rounded-md bg-emerald-600 text-white">
          <PackageCheck className="size-6" />
        </div>
      </div>
    )
  }

  if (type === 'ledger') {
    return (
      <div className="h-32 bg-amber-50 p-4 shadow-sm">
        <div className="grid h-full grid-cols-[0.8fr_1fr] gap-2">
          <div className="rounded-md bg-white p-3">
            <span className="block h-3 w-14 rounded-full bg-amber-400" />
            <span className="mt-3 block h-2 rounded-full bg-slate-200" />
            <span className="mt-2 block h-2 w-2/3 rounded-full bg-slate-200" />
          </div>
          <div className="grid gap-1.5">
            <span className="rounded-sm bg-white" />
            <span className="rounded-sm bg-amber-200" />
            <span className="rounded-sm bg-white" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'accountant') {
    return (
      <div className="h-32 bg-violet-50 p-4 shadow-sm">
        <div className="flex h-full items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-violet-500 text-white">
            <UsersRound className="size-6" />
          </div>
          <div className="flex-1">
            <span className="block h-3 w-24 rounded-full bg-violet-300" />
            <span className="mt-3 block h-2 rounded-full bg-white" />
            <span className="mt-2 block h-2 w-4/5 rounded-full bg-white" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'checks') {
    return (
      <div className="grid h-32 gap-2 bg-cyan-50 p-4 shadow-sm">
        {['GSTIN matched', 'Tax rows clear', 'Amount verified'].map((label) => (
          <div className="flex items-center gap-2 rounded-sm bg-white px-3 text-[10px] font-black uppercase tracking-wide text-cyan-800" key={label}>
            <CheckCircle2 className="size-3 text-cyan-500" />
            {label}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'tasks') {
    return (
      <div className="h-32 bg-rose-50 p-4 shadow-sm">
        <div className="grid h-full gap-2">
          {['Call customer', 'Send quote', 'Collect payment'].map((label, index) => (
            <div className="grid grid-cols-[14px_1fr] items-center gap-2 rounded-sm bg-white px-2" key={label}>
              <span className={`size-3 rounded-full ${index === 0 ? 'bg-rose-500' : index === 1 ? 'bg-amber-300' : 'bg-emerald-400'}`} />
              <span className="h-2 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'automation') {
    return (
      <div className="grid h-32 grid-cols-[40px_1fr_40px] items-center gap-3 bg-teal-50 p-4 shadow-sm">
        <div className="grid size-9 place-items-center rounded-full bg-teal-500 text-white">
          <Zap className="size-5" />
        </div>
        <div className="grid gap-2">
          <span className="h-2 rounded-full bg-teal-200" />
          <span className="h-2 rounded-full bg-teal-300" />
          <span className="h-2 rounded-full bg-teal-200" />
        </div>
        <div className="grid size-9 place-items-center rounded-full bg-white text-teal-600">
          <ArrowRight className="size-5" />
        </div>
      </div>
    )
  }

  if (type === 'reminders') {
    return (
      <div className="h-32 bg-orange-50 p-4 shadow-sm">
        <div className="flex h-full items-end gap-2">
          {[48, 76, 58, 88].map((height, index) => (
            <div className="flex flex-1 flex-col items-center gap-1" key={height}>
              <span className="w-full rounded-t-md bg-orange-300" style={{ height: `${height}%` }} />
              <span className={`size-1.5 rounded-full ${index === 3 ? 'bg-orange-600' : 'bg-orange-200'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-32 grid-cols-3 gap-2 bg-slate-50 p-4 shadow-sm">
      {[36, 68, 52].map((height, index) => (
        <div className="flex items-end rounded-md bg-white p-2" key={height}>
          <span className={`w-full rounded-t-md ${index === 0 ? 'bg-amber-300' : index === 1 ? 'bg-teal-400' : 'bg-sky-400'}`} style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  )
}

const whyItems = [
  {
    icon: Sparkles,
    title: 'Simple from day one',
    description: 'Clean screens, clear actions, and less setup noise help teams start without a long learning curve.',
    stat: '01',
  },
  {
    icon: Clock3,
    title: 'Less switching, more finishing',
    description: 'Website, billing, users, and business tools stay close together, so daily work moves with fewer breaks.',
    stat: '02',
  },
  {
    icon: UsersRound,
    title: 'Built for real teams',
    description: 'Codexsun keeps roles, access, and shared work organized as your business adds people and process.',
    stat: '03',
  },
]

function HomeWhySection() {
  return (
    <section className="border-t border-sky-300/20 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_34px),radial-gradient(circle_at_10%_20%,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,#082f49_0%,#115e59_48%,#111827_100%)] py-14 text-white md:py-16">
      <div className="cx-container">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <ScrollReveal direction="left" distance={32}>
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-cyan-200">Why Codexsun</p>
              <h2 className="text-3xl font-black leading-tight tracking-normal md:text-4xl">
                Software that feels lighter, even when the work gets bigger.
              </h2>
              <p className="mt-4 text-base leading-7 text-cyan-50/80">
                Codexsun is shaped for businesses that want practical tools, clear screens, and a workspace that can grow without becoming confusing.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-3">
            {whyItems.map((item, index) => (
              <ScrollReveal delay={index * 0.08} direction="right" distance={28} key={item.title}>
                <WhyRow item={item} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyRow({ item }: { item: typeof whyItems[number] }) {
  const Icon = item.icon

  return (
    <article className="grid gap-4 rounded-md border border-white/15 bg-white/10 p-5 shadow-sm shadow-cyan-950/30 backdrop-blur md:grid-cols-[56px_1fr_44px] md:items-center">
      <div className="flex size-12 items-center justify-center rounded-md border border-teal-200/30 bg-teal-200/15 text-teal-100">
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="text-lg font-black">{item.title}</h3>
        <p className="mt-1 text-sm leading-6 text-cyan-50/75">{item.description}</p>
      </div>
      <span className="text-right text-2xl font-black text-fuchsia-200/50">{item.stat}</span>
    </article>
  )
}

const pricingPlans = [
  {
    button: 'Get started',
    description: 'For small teams that need a polished website and a clear business base.',
    features: ['Website pages and sliders', 'Basic business dashboard', 'Company profile setup'],
    name: 'Personal',
    price: 'Free',
  },
  {
    button: 'Choose plan',
    description: 'For growing teams ready to connect billing, products, and customer work.',
    features: ['Billing and receipt workspace', 'Products and customer records', 'Team access controls'],
    name: 'Startup',
    price: 'Rs. 4,999',
    suffix: '/month',
  },
  {
    button: 'Choose plan',
    description: 'For established teams that want daily workflows, reporting, and automation together.',
    features: ['Everything in Startup', 'Task manager and reminders', 'Priority setup support'],
    highlighted: true,
    name: 'Company',
    price: 'Rs. 8,999',
    suffix: '/month',
  },
  {
    button: 'Contact sales',
    description: 'For multi-team businesses that need tailored modules and implementation support.',
    features: ['Custom workflows and modules', 'Advanced data and reports', 'Dedicated rollout planning'],
    name: 'Enterprise',
    price: 'Custom',
  },
]

function HomePricingSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Simple pricing</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
                Choose the plan that fits your business.
              </h2>
            </div>
            <div className="grid gap-5 lg:justify-items-end">
              <div className="relative inline-flex w-fit items-center gap-1 rounded-full bg-white p-1 shadow-xl shadow-slate-950/8">
                <span className="rounded-full bg-slate-100 px-5 py-3 text-sm font-bold">Monthly</span>
                <span className="px-5 py-3 text-sm font-bold text-slate-600">Annual</span>
                <span className="rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white">Save 20%</span>
                <span className="absolute -right-4 -top-6 rotate-[-10deg] rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase text-white">
                  Big deal
                </span>
              </div>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                Start light, then move into billing, task management, ecommerce, and tailored operations as the business grows.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan, index) => (
            <ScrollReveal delay={index * 0.05} direction="bottom" distance={24} key={plan.name}>
              <PricingCard plan={plan} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({ plan }: { plan: typeof pricingPlans[number] }) {
  const highlighted = plan.highlighted

  return (
    <article className={`flex min-h-[490px] flex-col rounded-md border p-6 shadow-sm ${highlighted ? 'border-emerald-900 bg-[linear-gradient(160deg,#065f46_0%,#047857_100%)] text-white shadow-emerald-950/20' : 'border-slate-200 bg-white text-slate-950 shadow-slate-950/5'}`}>
      <div className="min-h-[128px]">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-black tracking-normal">{plan.name}</h3>
          {highlighted ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">Recommended</span> : null}
        </div>
        <p className={`mt-5 text-sm leading-6 ${highlighted ? 'text-emerald-50/82' : 'text-slate-600'}`}>{plan.description}</p>
      </div>

      <div className={`mt-7 border-y py-7 ${highlighted ? 'border-white/12' : 'border-slate-200'}`}>
        <p className="flex items-end gap-1 text-5xl font-black leading-none tracking-normal">
          {plan.price}
          {plan.suffix ? <span className={`pb-1 text-base font-bold ${highlighted ? 'text-emerald-50' : 'text-slate-600'}`}>{plan.suffix}</span> : null}
        </p>
      </div>

      <button className={`mt-7 inline-flex h-14 items-center justify-center rounded-md border px-5 text-base font-black transition ${highlighted ? 'border-white bg-white text-slate-950 hover:bg-emerald-50' : 'border-slate-950 bg-white text-slate-950 hover:bg-slate-950 hover:text-white'}`} type="button">
        {plan.button}
      </button>

      <div className="mt-7">
        <p className={`text-sm font-black ${highlighted ? 'text-white' : 'text-slate-950'}`}>Everything on Basic plan, plus</p>
        <ul className="mt-4 grid gap-3">
          {plan.features.map((feature) => (
            <li className={`flex gap-3 text-sm leading-6 ${highlighted ? 'text-emerald-50' : 'text-slate-700'}`} key={feature}>
              <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${highlighted ? 'text-lime-200' : 'text-emerald-600'}`} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

const faqItems = [
  {
    answer: 'Codexsun brings public website content, billing, products, customers, team access, dashboards, and everyday follow-up into one connected business workspace.',
    question: 'What features does Codexsun offer?',
  },
  {
    answer: 'It helps teams reduce scattered work by keeping customer activity, invoices, payments, tasks, and reporting close together in one operating flow.',
    question: 'How can Codexsun benefit my organization?',
  },
  {
    answer: 'Yes. Smaller teams can begin with a website and billing foundation, while larger teams can expand into role access, automation, reports, and tailored workflows.',
    question: 'Is Codexsun suitable for small businesses or larger teams?',
  },
  {
    answer: 'Codexsun is built around modules, so the workspace can be shaped around billing, ecommerce, task management, audit support, or other business needs.',
    question: 'Is Codexsun customizable to fit our specific needs?',
  },
  {
    answer: 'Business information is organized around tenant-aware access, controlled workspaces, and practical permission boundaries for day-to-day use.',
    question: 'How secure is the data stored on Codexsun?',
  },
  {
    answer: 'Codexsun keeps team access, business records, and operational screens structured clearly so ownership and control stay visible as the company grows.',
    question: 'How secure is Codexsun?',
  },
]

function HomeFaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="overflow-hidden bg-[radial-gradient(circle_at_25%_0%,rgba(254,240,138,0.28),transparent_32%),radial-gradient(circle_at_50%_5%,rgba(187,247,208,0.32),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-normal leading-tight tracking-normal md:text-6xl">
              Have a question?
              <span className="block">We are here to answer.</span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="bottom" distance={28}>
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white/90 shadow-xl shadow-slate-950/5 backdrop-blur">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index

              return (
                <div className="border-b border-slate-200 last:border-b-0" key={item.question}>
                  <button
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-6"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    type="button"
                  >
                    <span className="text-lg font-black leading-7 text-slate-950">{item.question}</span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500">
                      {isOpen ? <X className="size-5" /> : <Plus className="size-5" />}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-5 pb-7 md:px-6">
                      <p className="max-w-2xl text-base leading-7 text-slate-600">{item.answer}</p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal direction="bottom" distance={24}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
            <p className="text-base text-slate-700">Still confused? No need to worry, just contact us.</p>
            <button className="inline-flex items-center justify-center rounded-md bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800" type="button">
              Contact our support
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function HomeStorySection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length)
    }, 5200)

    return () => window.clearInterval(timer)
  }, [])

  const goToPrevious = () => {
    setActiveTestimonial((current) => (current === 0 ? testimonials.length - 1 : current - 1))
  }

  const goToNext = () => {
    setActiveTestimonial((current) => (current + 1) % testimonials.length)
  }

  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="grid gap-12 lg:grid-cols-[0.78fr_auto_1.22fr] lg:items-center lg:gap-14">
            <div className="flex gap-5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white text-blue-700 shadow-sm">
                <BriefcaseBusiness className="size-8" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">What teams say</p>
                <h2 className="mt-3 text-4xl font-normal leading-tight tracking-normal">Codexsun for growing businesses</h2>
                <p className="mt-4 max-w-lg text-lg leading-8 text-slate-600">
                  Teams use Codexsun to connect their website, billing, customer work, and everyday operations from one clearer place.
                </p>
              </div>
            </div>

            <div className="hidden h-72 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent lg:block" />

            <TestimonialSlider
              activeIndex={activeTestimonial}
              onNext={goToNext}
              onPrevious={goToPrevious}
              onSelect={setActiveTestimonial}
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

const testimonials = [
  {
    initials: 'CS',
    name: 'Codexsun product team',
    quote: 'Codexsun keeps the public website and daily business tools moving together, so teams can work with fewer gaps and clearer ownership.',
    role: 'Business software for practical growth',
    tone: 'bg-blue-100 text-blue-900',
  },
  {
    initials: 'SR',
    name: 'Sunmart Retail',
    quote: 'Our billing, products, and follow-ups now feel connected. The team can see what is pending without asking across separate tools.',
    role: 'Retail operations team',
    tone: 'bg-emerald-100 text-emerald-900',
  },
  {
    initials: 'BL',
    name: 'BluePeak Services',
    quote: 'The website gives customers a clear front door, while the workspace helps us continue the same conversation inside the business.',
    role: 'Service business owner',
    tone: 'bg-amber-100 text-amber-900',
  },
]

function TestimonialSlider({
  activeIndex,
  onNext,
  onPrevious,
  onSelect,
}: {
  activeIndex: number
  onNext(): void
  onPrevious(): void
  onSelect(index: number): void
}) {
  return (
    <div>
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-out will-change-transform"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {testimonials.map((testimonial) => (
            <figure className="min-h-[320px] w-full shrink-0 pr-1" key={testimonial.name}>
              <blockquote className="font-serif text-3xl leading-[1.45] text-slate-950 md:text-4xl">
                "{testimonial.quote}"
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <div className={`grid size-16 shrink-0 place-items-center rounded-full text-lg font-black ${testimonial.tone}`}>
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-black text-slate-950">{testimonial.name}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{testimonial.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {testimonials.map((item, index) => (
            <button
              aria-label={`Show testimonial from ${item.name}`}
              className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-8 bg-sky-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
              key={item.name}
              onClick={() => onSelect(index)}
              type="button"
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Previous testimonial"
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-sky-600 hover:text-white"
            onClick={onPrevious}
            type="button"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            aria-label="Next testimonial"
            className="flex size-11 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-sky-600"
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

const valueItems = [
  {
    icon: Clock3,
    title: 'Long-term clarity',
    description: 'We keep the product language simple and the screens focused, so teams can keep using it as the business grows.',
  },
  {
    icon: LifeBuoy,
    title: 'Customer-first workflows',
    description: 'Every section starts from the work a real team needs to complete: publish, bill, follow up, and report.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy and control',
    description: 'Codexsun is prepared around clear access, business-owned content, and practical control over the workspace.',
  },
  {
    icon: Zap,
    title: 'Useful automation',
    description: 'Automation should remove repeated effort without hiding what happened or making the next step hard to find.',
  },
]

function HomeValuesSection() {
  return (
    <section className="bg-[linear-gradient(135deg,rgba(14,165,233,0.08)_0_1px,transparent_1px_38px),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.18),transparent_26%),linear-gradient(180deg,#ecfeff_0%,#f8fafc_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl font-normal leading-tight tracking-normal md:text-5xl">
                The values that shape Codexsun
              </h2>
              <div className="mx-auto mt-6 flex w-fit gap-2">
                <span className="h-1 w-8 rounded-full bg-sky-500" />
                <span className="h-1 w-8 rounded-full bg-amber-400" />
                <span className="h-1 w-8 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="mt-12 grid gap-x-14 gap-y-12 border-t border-slate-200 pt-12 md:grid-cols-2">
              {valueItems.map((item, index) => (
                <ScrollReveal delay={index * 0.07} direction={index % 2 === 0 ? 'left' : 'right'} distance={26} key={item.title}>
                  <ValueItem item={item} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function ValueItem({ item }: { item: typeof valueItems[number] }) {
  const Icon = item.icon

  return (
    <article className="grid gap-5 sm:grid-cols-[56px_1fr]">
      <div className="flex size-14 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-sm shadow-sky-950/5">
        <Icon className="size-7" />
      </div>
      <div>
        <h3 className="text-3xl font-normal leading-tight tracking-normal">{item.title}</h3>
        <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">{item.description}</p>
      </div>
    </article>
  )
}

const blogPosts = [
  {
    author: 'Codexsun',
    category: 'Software Development',
    date: '16 Nov 2026',
    description: 'A practical look at how connected screens help teams reduce repeated entry, missed follow-ups, and scattered records.',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80',
    title: 'How connected business software keeps daily work clearer',
  },
  {
    author: 'Admin',
    category: 'Web Development',
    date: '20 Dec 2026',
    description: 'Your public website can do more than explain the brand. It can become the starting point for customer and billing workflows.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
    title: 'Why your website should connect to the workspace behind it',
  },
  {
    author: 'Support',
    category: 'IT Services',
    date: '22 Dec 2026',
    description: 'From invoices to reminders, the right operating layer helps owners see what needs attention before the day gets crowded.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
    title: 'Simple dashboards that help growing teams move faster',
  },
]

function HomeBlogsSection() {
  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Blogs</p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal md:text-5xl">
              Read our latest tips and tricks
            </h2>
            <div className="mx-auto mt-6 flex w-fit gap-2">
              <span className="h-1 w-8 rounded-full bg-sky-500" />
              <span className="h-1 w-8 rounded-full bg-amber-400" />
              <span className="h-1 w-8 rounded-full bg-emerald-500" />
            </div>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {blogPosts.map((post, index) => (
            <ScrollReveal delay={index * 0.06} direction="bottom" distance={26} key={post.title}>
              <BlogCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function BlogCard({ post }: { post: typeof blogPosts[number] }) {
  return (
    <article className="group h-full overflow-hidden rounded-md border border-slate-100 bg-white shadow-lg shadow-slate-950/5 transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-950/12">
      <div className="relative overflow-hidden">
        <img
          alt={post.title}
          className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
          src={post.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/18 to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute bottom-5 right-5 rounded-full bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-lg shadow-blue-950/20">
          {post.category}
        </span>
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-blue-700" />
            {post.date}
          </span>
          <span className="inline-flex items-center gap-2">
            <UserRound className="size-4 text-blue-700" />
            {post.author}
          </span>
        </div>

        <h3 className="text-xl font-black leading-7 tracking-normal text-slate-950 transition group-hover:text-blue-700">
          {post.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">{post.description}</p>
        <button className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-950 transition hover:text-blue-700" type="button">
          Learn more
          <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </button>
      </div>
    </article>
  )
}

function HomeFinalCta() {
  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={30}>
          <div className="grid overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(135deg,rgba(245,158,11,0.12)_0_1px,transparent_1px_34px),linear-gradient(120deg,#ecfeff_0%,#ffffff_48%,#fefce8_100%)] shadow-xl shadow-slate-950/5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-8 md:p-12">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Ready for the next section of growth</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-normal md:text-5xl">
                Build your website, run your work, and keep the brand experience consistent.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Start with a polished public page and extend into billing, products, customer work, dashboards, and team operations when you are ready.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-700" type="button">
                  Start with Codexsun
                  <ArrowRight className="size-4" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-800 transition hover:border-slate-500" type="button">
                  See features
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
              {ctaConcepts.map((concept) => (
                <CtaConceptCard concept={concept} key={concept.title} />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

const ctaConcepts = [
  {
    accent: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Publish a clean front page, sliders, service blocks, and lead sections that tell customers exactly what you do.',
    icon: Globe2,
    title: 'Brand website launch',
    visual: 'website',
  },
  {
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Show products, offers, enquiry paths, and customer actions from the same business identity.',
    icon: Store,
    title: 'Storefront experience',
    visual: 'store',
  },
  {
    accent: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'Move from customer intent to invoice, receipt, payment follow-up, and accountant-ready records.',
    icon: ReceiptText,
    title: 'Billing desk',
    visual: 'billing',
  },
  {
    accent: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'See daily totals, pending tasks, reminders, and team status before small gaps become bigger problems.',
    icon: BarChart3,
    title: 'Growth cockpit',
    visual: 'dashboard',
  },
]

function CtaConceptCard({ concept }: { concept: typeof ctaConcepts[number] }) {
  const Icon = concept.icon

  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
      <CtaConceptVisual type={concept.visual} />
      <div className="p-5">
        <div className={`mb-4 flex size-11 items-center justify-center rounded-md border ${concept.accent}`}>
          <Icon className="size-6" />
        </div>
        <h3 className="text-xl font-black tracking-normal text-slate-950">{concept.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{concept.description}</p>
      </div>
    </article>
  )
}

function CtaConceptVisual({ type }: { type: string }) {
  if (type === 'website') {
    return (
      <div className="h-32 bg-[linear-gradient(135deg,#e0f2fe,#ffffff)] p-4">
        <div className="h-full rounded-md border border-sky-200 bg-white p-3 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-sky-500" />
          <div className="mt-3 h-5 w-36 rounded-md bg-slate-900" />
          <div className="mt-2 h-2 w-44 rounded-full bg-slate-200" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <span className="h-8 rounded-md bg-sky-100" />
            <span className="h-8 rounded-md bg-emerald-100" />
            <span className="h-8 rounded-md bg-amber-100" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'store') {
    return (
      <div className="h-32 bg-[linear-gradient(135deg,#dcfce7,#ffffff)] p-4">
        <div className="grid h-full grid-cols-3 gap-2">
          {['bg-emerald-200', 'bg-sky-200', 'bg-amber-200'].map((tone, index) => (
            <div className="rounded-md border border-white/80 bg-white p-2 shadow-sm" key={tone}>
              <div className={`h-12 rounded-md ${tone}`} />
              <div className="mt-2 h-2 rounded-full bg-slate-200" />
              <div className={`mt-2 h-3 w-12 rounded-full ${index === 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'billing') {
    return (
      <div className="h-32 bg-[linear-gradient(135deg,#ffe4e6,#ffffff)] p-4">
        <div className="relative h-full">
          <div className="absolute left-8 top-1 h-24 w-36 rotate-[-5deg] rounded-md border border-rose-100 bg-white shadow-sm" />
          <div className="absolute left-14 top-3 h-24 w-36 rounded-md border border-rose-200 bg-white p-3 shadow-md">
            <div className="h-3 w-16 rounded-full bg-rose-500" />
            <div className="mt-3 h-2 w-24 rounded-full bg-slate-200" />
            <div className="mt-2 h-2 w-28 rounded-full bg-slate-200" />
            <div className="mt-5 h-5 w-20 rounded-md bg-slate-900" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-32 bg-[linear-gradient(135deg,#fef3c7,#ffffff)] p-4">
      <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-3">
        <div className="rounded-md border border-amber-200 bg-white p-3 shadow-sm">
          <div className="flex h-full items-end gap-2">
            {[42, 68, 54, 86, 72].map((height) => (
              <span className="flex-1 rounded-t-md bg-amber-400" key={height} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="rounded-md bg-white shadow-sm" />
          <span className="rounded-md bg-white shadow-sm" />
          <span className="rounded-md bg-white shadow-sm" />
        </div>
      </div>
    </div>
  )
}

function StaticHomeHero({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex h-[calc(100svh-10rem)] min-h-[420px] items-center bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#0f172a,#111827_48%,#172554)] text-white">
      <div className="cx-container max-w-5xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Workspace ready</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
          Welcome to the {tenantName} workspace.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200 md:text-xl">
          Every app your team needs comes together in one calm, connected place, so the work feels clear from the first click.
        </p>
      </div>
    </div>
  )
}
