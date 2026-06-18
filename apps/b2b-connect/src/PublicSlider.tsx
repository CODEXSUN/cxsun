import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { DevBadge, Reveal } from "./public-sections"

export type PublicSliderAction = {
  label: string
  target: string
  variant?: "primary" | "ghost"
}

export type PublicSliderSlide = {
  id: string
  eyebrow: string
  title: string
  body: string
  image: string
  imagePosition?: string
  actions?: PublicSliderAction[]
}

export type PublicSliderOptions = {
  bulletPosition?: "content" | "bottom"
  duration?: number
  progressPosition?: "bottom-center" | "bottom-right"
  variant?: "home-slider" | "catalog-slider" | "text-slider"
}

type PublicSliderProps = {
  devLabel?: string
  id: string
  onNavigate(target: string): void
  options?: PublicSliderOptions
  renderLayer?: (slide: PublicSliderSlide, index: number) => ReactNode
  slides: PublicSliderSlide[]
}

const defaultDuration = 6500
const progressRadius = 26
const progressCircumference = 2 * Math.PI * progressRadius

export function PublicSlider({ devLabel, id, onNavigate, options, renderLayer, slides }: PublicSliderProps) {
  const sliderOptions: Required<PublicSliderOptions> = {
    bulletPosition: "content",
    duration: defaultDuration,
    progressPosition: "bottom-center",
    variant: "home-slider",
    ...options,
  }
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slide = slides[activeSlide] ?? slides[0]

  const goToSlide = useCallback(
    (index: number) => {
      if (!slides.length) return
      setActiveSlide(index)
      setProgress(0)
      startTimeRef.current = performance.now()
    },
    [slides.length],
  )

  const nextSlide = useCallback(() => {
    if (!slides.length) return
    goToSlide((activeSlide + 1) % slides.length)
  }, [activeSlide, goToSlide, slides.length])

  const previousSlide = useCallback(() => {
    if (!slides.length) return
    goToSlide((activeSlide - 1 + slides.length) % slides.length)
  }, [activeSlide, goToSlide, slides.length])

  useEffect(() => {
    startTimeRef.current = performance.now()
    setProgress(0)
  }, [activeSlide])

  useEffect(() => {
    if (!isPlaying || slides.length <= 1) return

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const percent = Math.min(elapsed / sliderOptions.duration, 1)
      setProgress(percent)
      if (percent < 1) animationRef.current = requestAnimationFrame(animate)
    }

    intervalRef.current = setInterval(nextSlide, sliderOptions.duration)
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [activeSlide, isPlaying, nextSlide, sliderOptions.duration, slides.length])

  if (!slide) return null

  const progressOffset = progressCircumference * (1 - progress)

  return (
    <section className={`hero-section public-slider public-slider-${sliderOptions.variant}`} id={id}>
      {devLabel ? <DevBadge label={devLabel} /> : null}
      <div
        className="hero-image public-slider-frame"
        key={slide.id}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.82), rgba(2,6,23,0.54), rgba(2,6,23,0.16)), url(${slide.image})`,
          backgroundPosition: slide.imagePosition ?? "center",
        }}
      >
        <button aria-label="Previous slide" className="hero-arrow hero-arrow-left" onClick={previousSlide} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
        </button>
        <button aria-label="Next slide" className="hero-arrow hero-arrow-right" onClick={nextSlide} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
        </button>

        <Reveal className="hero-copy hero-slide-content">
          <p className="eyebrow">{slide.eyebrow}</p>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          {slide.actions?.length ? (
            <div className="hero-actions">
              {slide.actions.map((action) => (
                <button className={action.variant === "ghost" ? "ghost-button ghost-button-dark" : "primary-button"} key={`${slide.id}-${action.label}`} type="button" onClick={() => onNavigate(action.target)}>
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          {sliderOptions.bulletPosition === "content" ? <SliderBullets activeSlide={activeSlide} goToSlide={goToSlide} slides={slides} /> : null}
        </Reveal>

        {renderLayer ? renderLayer(slide, activeSlide) : null}

        {sliderOptions.bulletPosition === "bottom" ? <SliderBullets activeSlide={activeSlide} goToSlide={goToSlide} slides={slides} /> : null}

        <div className={`hero-progress hero-progress-${sliderOptions.progressPosition}`} aria-label="Hero slider progress">
          <svg aria-hidden="true" height="56" viewBox="0 0 56 56" width="56">
            <circle cx="28" cy="28" fill="none" r={progressRadius} stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
            <circle cx="28" cy="28" fill="none" r={progressRadius} stroke="white" strokeDasharray={progressCircumference} strokeDashoffset={progressOffset} strokeLinecap="round" strokeWidth="3" />
          </svg>
          <button
            aria-label={isPlaying ? "Pause slider" : "Play slider"}
            onClick={() => {
              setIsPlaying((value) => {
                const nextValue = !value
                if (nextValue) {
                  startTimeRef.current = performance.now()
                  setProgress(0)
                }
                return nextValue
              })
            }}
            type="button"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </div>
    </section>
  )
}

function SliderBullets({ activeSlide, goToSlide, slides }: { activeSlide: number; goToSlide(index: number): void; slides: PublicSliderSlide[] }) {
  return (
    <div className="slide-bullets" aria-label="Hero slider controls">
      {slides.map((item, index) => (
        <button aria-label={`Go to ${item.id}`} className={index === activeSlide ? "active" : ""} key={item.id} type="button" onClick={() => goToSlide(index)}>
          <span>{item.id}</span>
        </button>
      ))}
    </div>
  )
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" className="hero-progress-icon" viewBox="0 0 24 24">
      <rect height="3" rx="1" width="10" x="7" y="8" />
      <rect height="3" rx="1" width="10" x="7" y="13" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" className="hero-progress-icon" viewBox="0 0 24 24">
      <path d="M9 7.5v9l7-4.5z" />
    </svg>
  )
}
