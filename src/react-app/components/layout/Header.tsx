import { MapPin, LogIn, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

export function Header() {
  const { user, isInitialized, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex h-12 items-center justify-between px-3 sm:h-14 sm:px-4 lg:px-6">
        {/* Logo and title */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
          <MapPin className="h-5 w-5 text-primary-600 sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold sm:text-base">Sri Lanka Road Status</span>
        </Link>

        {/* Auth section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isInitialized ? (
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <>
              <div className="hidden items-center gap-1.5 sm:flex">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:px-3"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 rounded-md bg-primary-600 px-2 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:px-3"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
