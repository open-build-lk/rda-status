import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Github } from "lucide-react";

export function Footer() {
  const { t, i18n } = useTranslation();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/v1/map/last-updated")
      .then((res) => res.json() as Promise<{ lastUpdated: string | null }>)
      .then((data) => {
        if (data.lastUpdated) {
          setLastUpdated(new Date(data.lastUpdated));
        }
      })
      .catch(console.error);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <footer className="border-t border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950 sm:px-4 sm:py-4">
      <div className="flex flex-col items-start gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <div className="line-clamp-1 sm:line-clamp-none">
          <span className="hidden sm:inline">{t("common:footer.dataSource")} </span>
          {lastUpdated ? (
            <span>{t("common:footer.lastUpdated", { date: formatDate(lastUpdated) })}</span>
          ) : (
            <span>{t("messages.loading")}</span>
          )}
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
