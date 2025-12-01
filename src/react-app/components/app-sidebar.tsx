import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Shield,
  AlertTriangle,
  ChevronUp,
  LogOut,
  MapPin,
  Users,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  items?: { title: string; url: string }[];
}

const platformItems: NavItem[] = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  // Dashboard and Projects hidden for now
  // {
  //   title: "Dashboard",
  //   url: "/dashboard",
  //   icon: LayoutDashboard,
  //   roles: ["field_officer", "planner", "admin", "super_admin", "stakeholder"],
  // },
  // {
  //   title: "Projects",
  //   url: "/projects",
  //   icon: FolderKanban,
  //   roles: ["planner", "admin", "super_admin", "stakeholder"],
  // },
];

const adminItems: NavItem[] = [
  {
    title: "Citizen Reports",
    url: "/admin/reports",
    icon: Shield,
    roles: ["field_officer", "planner", "admin", "super_admin"],
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    roles: ["super_admin"],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const userRole = user?.role || "citizen";
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogout = async () => {
    await logout();
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const shortenName = (fullName: string, maxLength = 20) => {
    if (fullName.length <= maxLength) return fullName;
    return fullName.substring(0, maxLength) + '...';
  };

  const filterByRole = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(userRole);
    });
  };

  const visiblePlatformItems = filterByRole(platformItems);
  const visibleAdminItems = filterByRole(adminItems);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" onClick={handleLinkClick}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <MapPin className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Road Status</span>
                  <span className="truncate text-xs text-gray-500">Sri Lanka</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Platform Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visiblePlatformItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url} onClick={handleLinkClick}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url} onClick={handleLinkClick}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/report"}
                  tooltip="Report Incident"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <Link to="/report" onClick={handleLinkClick}>
                    <AlertTriangle className="size-4" />
                    <span>Report Incident</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Collapsible className="group/collapsible">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.image} alt={user?.name} />
                    <AvatarFallback className="rounded-lg bg-primary-100 text-primary-700 text-xs">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name ? shortenName(user.name, 20) : ""}
                    </span>
                    <span className="truncate text-xs text-gray-500">
                      {user?.email ? shortenName(user.email, 25) : ""}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <div className="px-2 py-1.5 text-xs text-gray-500">
                      Role: <span className="capitalize">{userRole.replace("_", " ")}</span>
                    </div>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <button
                        onClick={handleLogout}
                        className="w-full text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <LogOut className="size-4" />
                        <span>Log out</span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
