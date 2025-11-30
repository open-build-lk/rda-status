import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Data Source: Road Development Authority (RDA). Last Updated: 2025-11-30 7:30 PM
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
