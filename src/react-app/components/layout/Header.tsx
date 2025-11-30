import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex h-12 items-center px-3 sm:h-14 sm:px-4 lg:px-6">
        {/* Logo and title */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
          <MapPin className="h-5 w-5 text-primary-600 sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold sm:text-base">Sri Lanka Road Status</span>
        </Link>
      </div>
    </header>
  );
}
