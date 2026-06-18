import { useEffect, useRef, useState, type ReactNode } from "react"

export type NavItem = { label: string; target: string }
export type NavGroup = { title: string; items: NavItem[] }
export type SectionTone = "white" | "soft" | "ink" | "blue" | "green"

export function DevBadge({ label }: { label: string }) {
  return <span className="dev-badge">{label}</span>
}

export function PublicSection({ body, children, eyebrow, id, title, tone }: { body: string; children: ReactNode; eyebrow: string; id: string; title: string; tone: SectionTone }) {
  return (
    <section className={`public-section tone-${tone}`} id={id}>
      <DevBadge label={id.toUpperCase()} />
      <Reveal className="section-header">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </Reveal>
      {children}
    </section>
  )
}

export function Dropdown({ groups, label, onSelect }: { groups: NavGroup[]; label: string; onSelect(target: string): void }) {
  return (
    <span className="dropdown">
      <button type="button">{label}</button>
      <span className="dropdown-panel">
        {groups.map((group) => (
          <span className="dropdown-group" key={group.title}>
            <strong>{group.title}</strong>
            {group.items.map((item) => <button key={item.label} type="button" onClick={() => onSelect(item.target)}>{item.label}</button>)}
          </span>
        ))}
      </span>
    </span>
  )
}

export type CategoryCard = {
  body?: string
  icon?: string
  title: string
  tone?: "blue" | "emerald" | "orange" | "violet"
}

export function CategoryCloud({ categories }: { categories: Array<string | CategoryCard> }) {
  return (
    <Reveal className="category-grid" delay={80}>
      {categories.map((category) => {
        const item = typeof category === "string" ? { title: category } : category
        return (
          <button className={`category-card category-card-${item.tone ?? "blue"}`} key={item.title} type="button">
            <span className="category-icon">{item.icon ?? item.title.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{item.title}</strong>
              {item.body ? <small>{item.body}</small> : null}
            </span>
          </button>
        )
      })}
    </Reveal>
  )
}

export type ImageStorySlide = {
  badge: string
  body: string
  image?: string
  label: string
  tone: "blue" | "emerald" | "orange" | "violet"
  title: string
}

export function ImageStory({
  image,
  items,
  label,
  reverse,
  slides,
  title,
}: {
  image: string
  items: string[]
  label: string
  reverse?: boolean
  slides?: ImageStorySlide[]
  title: string
}) {
  const [activeSlide, setActiveSlide] = useState(0)
  const currentSlide = slides?.[activeSlide]
  const displayImage = currentSlide?.image ?? image
  const displayLabel = currentSlide?.label ?? label
  const displayTitle = currentSlide?.title ?? title

  return (
    <Reveal className={`image-story ${reverse ? "image-story-reverse" : ""}`} delay={90}>
      <figure>
        <img alt={displayLabel} loading="lazy" src={displayImage} />
      </figure>
      <div>
        <p className="eyebrow">{displayLabel}</p>
        <h3>{displayTitle}</h3>
        {slides?.length && currentSlide ? (
          <div className={`story-detail-card story-detail-${currentSlide.tone}`}>
            <p>{currentSlide.body}</p>
          </div>
        ) : null}
        <div className={`chip-list ${slides?.length ? "chip-list-switch" : ""}`}>
          {slides?.length
            ? slides.map((slide, index) => (
              <button
                className={`story-chip story-chip-${slide.tone} ${index === activeSlide ? "active" : ""}`}
                key={slide.badge}
                onClick={() => setActiveSlide(index)}
                type="button"
              >
                {slide.badge}
              </button>
            ))
            : items.map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </Reveal>
  )
}

export function CardGrid<T extends { body: string; eyebrow: string; title: string }>({ cards }: { cards: T[] }) {
  return (
    <div className="feature-grid">
      {cards.map((card, index) => (
        <Reveal className="feature-card" delay={index * 45} key={card.title}>
          <p>{card.eyebrow}</p>
          <h3>{card.title}</h3>
          <span>{card.body}</span>
        </Reveal>
      ))}
    </div>
  )
}

export function Timeline({ items }: { items: string[][] }) {
  return (
    <Reveal className="timeline" delay={80}>
      {items.map(([title, body], index) => (
        <article key={title}>
          <span>{index + 1}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </article>
      ))}
    </Reveal>
  )
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.16 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`${className} reveal ${visible ? "is-visible" : ""}`} ref={ref} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
