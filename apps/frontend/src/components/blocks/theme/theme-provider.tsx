import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'
type ColorTheme = 'neutral' | 'blue' | 'emerald' | 'orange' | 'indigo'

type ThemeProviderProps = {
  children: ReactNode
  defaultColorTheme?: ColorTheme
  defaultTheme?: Theme
  storageKey?: string
  colorStorageKey?: string
}

type ThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (colorTheme: ColorTheme) => void
  setTheme: (theme: Theme) => void
  theme: Theme
}

const initialState: ThemeProviderState = {
  colorTheme: 'neutral',
  setColorTheme: () => null,
  setTheme: () => null,
  theme: 'system',
}

const colorThemes: ColorTheme[] = [
  'neutral',
  'blue',
  'emerald',
  'orange',
  'indigo',
]
const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system'
}

function isColorTheme(value: string | null): value is ColorTheme {
  return colorThemes.includes(value as ColorTheme)
}

export function ThemeProvider({
  children,
  defaultColorTheme = 'neutral',
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  colorStorageKey = 'vite-ui-color-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme
    }

    const storedTheme = window.localStorage.getItem(storageKey)
    return isTheme(storedTheme) ? storedTheme : defaultTheme
  })

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') {
      return defaultColorTheme
    }

    const storedColorTheme = window.localStorage.getItem(colorStorageKey)
    return isColorTheme(storedColorTheme) ? storedColorTheme : defaultColorTheme
  })

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        root.classList.add(mediaQuery.matches ? 'dark' : 'light')
        return
      }

      root.classList.add(theme)
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)

    return () => {
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove(...colorThemes.map((item) => `theme-${item}`))
    root.classList.add(`theme-${colorTheme}`)
  }, [colorTheme])

  const value = useMemo<ThemeProviderState>(
    () => ({
      colorTheme,
      setColorTheme: (nextColorTheme) => {
        window.localStorage.setItem(colorStorageKey, nextColorTheme)
        setColorThemeState(nextColorTheme)
      },
      setTheme: (nextTheme) => {
        window.localStorage.setItem(storageKey, nextTheme)
        setThemeState(nextTheme)
      },
      theme,
    }),
    [colorStorageKey, colorTheme, storageKey, theme],
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
