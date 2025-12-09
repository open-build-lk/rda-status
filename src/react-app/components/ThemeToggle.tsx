import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  // Determine if currently showing dark mode
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    // Simple toggle between light and dark (not system)
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
