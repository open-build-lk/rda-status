import {
  Home,
  FileText,
  FolderKanban,
  BarChart3,
  Settings,
  Users,
  X,
  ClipboardList,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  roles: string[] | null; // null means public (visible to everyone)
}

// Navigation items with role-based visibility
// roles: null = visible to everyone (public)
// roles: [...] = visible only to specified roles
const navItems: NavItem[] = [
  {
    label: "Home",
    icon: <Home className="h-5 w-5" />,
    href: "/",
    roles: null,
  },
  {
    label: "Submit Report",
    icon: <FileText className="h-5 w-5" />,
    href: "/submit",
    roles: ["public", "citizen", "field_officer"],
  },
  {
    label: "Reports",
    icon: <ClipboardList className="h-5 w-5" />,
    href: "/reports",
    roles: null,
  },
  {
    label: "Dashboard",
    icon: <BarChart3 className="h-5 w-5" />,
    href: "/dashboard",
    roles: ["field_officer", "planner", "admin", "super_admin", "stakeholder"],
  },
  {
    label: "Projects",
    icon: <FolderKanban className="h-5 w-5" />,
    href: "/projects",
    roles: ["planner", "admin", "super_admin", "stakeholder"],
  },
];

const adminItems: NavItem[] = [
  {
    label: "Users",
    icon: <Users className="h-5 w-5" />,
    href: "/admin/users",
    roles: ["admin", "super_admin"],
  },
  {
    label: "Audit Trail",
    icon: <History className="h-5 w-5" />,
    href: "/admin/audit-trail",
    roles: ["super_admin"],
  },
  {
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
    href: "/admin/settings",
    roles: ["admin", "super_admin"],
  },
];

export function Sidebar({ isOpen, onClose, currentPath = "/" }: SidebarProps) {
  const { user } = useAuthStore();
  const userRole = user?.role || "public";

  // Filter items based on role
  const visibleNav = navItems.filter(
    (item) => item.roles === null || item.roles.includes(userRole)
  );

  const visibleAdmin = adminItems.filter((item) =>
    item.roles?.includes(userRole)
  );

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out dark:border-gray-800 dark:bg-gray-950 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800 lg:hidden">
          <span className="font-semibold">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Navigation
          </div>
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                currentPath === item.href
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}

          {/* Only show admin section if user has admin items visible */}
          {visibleAdmin.length > 0 && (
            <>
              <div className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Administration
              </div>
              {visibleAdmin.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    currentPath === item.href
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
