import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", label: "En" },
  { code: "si", label: "සිං" },
  { code: "ta", label: "த" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // Get current language, handling locale codes like "en-US"
  const currentLang = i18n.language?.split("-")[0] || "en";

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    localStorage.setItem("i18nextLng", lng);
  };

  return (
    <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => handleLanguageChange(lang.code)}
          className={cn(
            "px-2 py-1 text-xs font-medium transition-colors",
            lang.code === currentLang
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          )}
          aria-label={`Switch to ${lang.code}`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
