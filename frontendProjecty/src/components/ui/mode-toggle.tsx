import { Moon, Sun } from "lucide-react"
import { useTheme } from "../theme/theme-provider"

// Sized and colored to match the other round icon buttons it sits next to
// (NotificationBell, the profile trigger in AppShell) — h-9 w-9, rounded-full,
// same border/background/hover treatment, same muted-foreground icon color.
export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-ios-sm transition-colors hover:bg-accent hover:text-foreground"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}
