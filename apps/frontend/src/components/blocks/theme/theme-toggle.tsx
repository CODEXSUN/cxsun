import { Moon, Sun } from 'lucide-react'

import { useTheme } from 'src/components/blocks/theme/theme-provider'
import { Button } from 'src/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'

const colorThemeLabels = {
  neutral: 'Neutral',
  blue: 'Blue',
  emerald: 'Emerald',
  orange: 'Orange',
  indigo: 'Indigo',
}

const modeLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeToggle() {
  const { colorTheme, setColorTheme, setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Toggle theme" size="icon" type="button" variant="outline">
          <Sun className="size-[1.15rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-[1.15rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(value) => setTheme(value as keyof typeof modeLabels)}
          value={theme}
        >
          {Object.entries(modeLabels).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(value) =>
            setColorTheme(value as keyof typeof colorThemeLabels)
          }
          value={colorTheme}
        >
          {Object.entries(colorThemeLabels).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <span
                className={`size-2 rounded-full theme-swatch-${value}`}
                aria-hidden="true"
              />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
