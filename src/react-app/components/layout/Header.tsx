import { useState } from "react";
import {
  MapPin,
  LogIn,
  LogOut,
  User,
  AlertTriangle,
  Menu,
  X,
  Home,
  FileText,
  LayoutDashboard,
  FolderKanban,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // If undefined, public. If empty array, requires login but no specific role.
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="h-4 w-4" />,
  },
  {
    label: "Reports Map",
    href: "/reports",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    requiresAuth: true,
    roles: ["field_officer", "planner", "admin", "super_admin", "stakeholder"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: <FolderKanban className="h-4 w-4" />,
    requiresAuth: true,
    roles: ["planner", "admin", "super_admin", "stakeholder"],
  },
  {
    label: "Admin Reports",
    href: "/admin/reports",
    icon: <Shield className="h-4 w-4" />,
    requiresAuth: true,
    roles: ["admin", "super_admin"],
  },
];

export function Header() {
  const { user, isInitialized, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  const filteredNavItems = navItems.filter((item) => {
    // If requires auth and not logged in, hide
    if (item.requiresAuth && !user) return false;
    // If has role restrictions and user doesn't have required role, hide
    if (item.roles && user && !item.roles.includes(user.role)) return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-[99] w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex h-12 items-center justify-between px-3 sm:h-14 sm:px-4 lg:px-6">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          {/* Hamburger menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:h-9 sm:w-9"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo and title */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
            <MapPin className="h-5 w-5 text-primary-600 sm:h-6 sm:w-6" />
            <span className="text-sm font-semibold sm:text-base">
              Sri Lanka Road Status
            </span>
          </Link>
        </div>

        {/* Right: Actions and Auth section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Report Incident button */}
          <Link
            to="/report"
            className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 sm:px-3"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Report</span>
          </Link>

          {!isInitialized ? (
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <>
              <div className="hidden items-center gap-1.5 sm:flex">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.name}</span>
                {(user.role === "admin" || user.role === "super_admin") && (
                  <span className="ml-1 rounded bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                    {user.role === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                )}
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

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/20"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu panel */}
          <nav className="fixed left-0 right-0 top-12 z-[101] border-b border-gray-200 bg-white shadow-lg sm:top-14 sm:left-3 sm:right-auto sm:w-64 sm:rounded-lg dark:border-gray-800 dark:bg-gray-950">
            <div className="py-2">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    location.pathname === item.href
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              {/* Divider */}
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

              {/* Report link in menu too */}
              <Link
                to="/report"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <AlertTriangle className="h-4 w-4" />
                Report an Incident
              </Link>

              {/* User info in mobile menu */}
              {user && (
                <>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {user.role.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              )}

              {/* Login link if not logged in */}
              {!user && isInitialized && (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  <LogIn className="h-4 w-4" />
                  Login / Register
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
