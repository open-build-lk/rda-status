import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950 sm:px-4 sm:py-4">
      <div className="flex flex-col items-start gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <div className="line-clamp-1 sm:line-clamp-none">
          <span className="hidden sm:inline">Data Source: Road Development Authority (RDA). </span>
          <span>Last Updated: 2025-11-30 7:30 PM</span>
        </div>
        <a
          href="https://github.com/open-build-lk/rda-status"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Github className="h-4 w-4" />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
}
