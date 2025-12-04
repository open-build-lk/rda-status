import { useAuthStore } from "@/stores/auth";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useLocation, useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

// Separate component to access sidebar context
function SidebarContent({ children }: { children: React.ReactNode }) {
  const { state, isMobile, openMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  // Calculate margin based on sidebar state
  // Sidebar expanded: 20rem (320px), collapsed: 3rem (48px), mobile: 0
  const sidebarWidth = isMobile ? 0 : isCollapsed ? 48 : 320;

  // Hide main content on mobile when sidebar is open (to prevent map z-index issues)
  if (isMobile && openMobile) {
    return null;
  }

  const showReportBreadcrumb = location.pathname.startsWith("/report");

  return (
    <div
      className="flex h-screen flex-col transition-[margin,width] duration-200 ease-linear"
      style={{
        marginLeft: sidebarWidth,
        width: `calc(100vw - ${sidebarWidth}px)`,
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center gap-2 px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {showReportBreadcrumb ? (
            <Breadcrumb>
              <BreadcrumbList className="items-center gap-2 text-sm">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/");
                    }}
                    className="text-sm font-semibold text-gray-800 dark:text-gray-100"
                  >
                    Sri Lanka Road Status
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Report Incident
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          ) : (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
              Sri Lanka Road Status
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { user, isInitialized } = useAuthStore();

  // Show sidebar layout for logged-in users
  if (user && isInitialized) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarContent>{children}</SidebarContent>
      </SidebarProvider>
    );
  }

  // Regular layout for non-logged-in users
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
      <Footer />
    </div>
  );
}
