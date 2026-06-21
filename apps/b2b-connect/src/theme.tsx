import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Moon, Sun } from "lucide-react"

type ThemeMode = "light" | "dark" | "system"
type ColorTheme = "neutral" | "blue" | "emerald" | "orange" | "indigo"

type ThemeContextValue = {
  colorTheme: ColorTheme
  setColorTheme(theme: ColorTheme): void
  setTheme(mode: ThemeMode): void
  theme: ThemeMode
}

const themeModes: ThemeMode[] = ["light", "dark", "system"]
const colorThemes: ColorTheme[] = ["neutral", "blue", "emerald", "orange", "indigo"]

const modeLabels: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

const colorThemeLabels: Record<ColorTheme, string> = {
  neutral: "Neutral",
  blue: "Blue",
  emerald: "Emerald",
  orange: "Orange",
  indigo: "Indigo",
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isThemeMode(value: string | null): value is ThemeMode {
  return themeModes.includes(value as ThemeMode)
}

function isColorTheme(value: string | null): value is ColorTheme {
  return colorThemes.includes(value as ColorTheme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem("tirupur-connect-theme")
    return isThemeMode(stored) ? stored : "system"
  })
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = window.localStorage.getItem("tirupur-connect-color-theme")
    return isColorTheme(stored) ? stored : "blue"
  })

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    function applyTheme() {
      root.classList.remove("light", "dark")
      root.classList.add(theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme)
    }

    applyTheme()
    mediaQuery.addEventListener("change", applyTheme)

    return () => mediaQuery.removeEventListener("change", applyTheme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove(...colorThemes.map((item) => `theme-${item}`))
    root.classList.add(`theme-${colorTheme}`)
  }, [colorTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorTheme,
      setColorTheme: (nextTheme) => {
        window.localStorage.setItem("tirupur-connect-color-theme", nextTheme)
        setColorThemeState(nextTheme)
      },
      setTheme: (nextTheme) => {
        window.localStorage.setItem("tirupur-connect-theme", nextTheme)
        setThemeState(nextTheme)
      },
      theme,
    }),
    [colorTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider")
  }

  return context
}

export function ThemeToggle() {
  const { colorTheme, setColorTheme, setTheme, theme } = useTheme()

  return (
    <div className="theme-menu">
      <button aria-label="Toggle theme" aria-haspopup="menu" className="theme-button" type="button">
        <Sun aria-hidden="true" className="theme-icon theme-icon-sun" size={18} strokeWidth={2.4} />
        <Moon aria-hidden="true" className="theme-icon theme-icon-moon" size={18} strokeWidth={2.4} />
      </button>
      <div className="theme-panel" role="menu">
        <strong>Mode</strong>
        <div className="theme-options" role="group" aria-label="Theme mode">
          {themeModes.map((mode) => (
            <button className={theme === mode ? "selected" : ""} key={mode} onClick={() => setTheme(mode)} type="button">
              {modeLabels[mode]}
            </button>
          ))}
        </div>

        <strong>Theme</strong>
        <div className="theme-options" role="group" aria-label="Color theme">
          {colorThemes.map((item) => (
            <button className={colorTheme === item ? "selected" : ""} key={item} onClick={() => setColorTheme(item)} type="button">
              <span aria-hidden="true" className={`theme-swatch theme-swatch-${item}`} />
              {colorThemeLabels[item]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
