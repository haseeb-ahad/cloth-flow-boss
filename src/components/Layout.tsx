import { ReactNode, useMemo, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone, TIMEZONES } from "@/contexts/TimezoneContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard,
  Store,
  Users,
  Settings,
  LogOut,
  UserCog,
  Banknote,
  Receipt,
  Clock,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Menu
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LayoutProps {
  children: ReactNode;
}

interface AppSettings {
  app_name: string | null;
  logo_url: string | null;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { userRole, signOut, user, hasPermission } = useAuth();
  const { timezone } = useTimezone();
  const [appSettings, setAppSettings] = useState<AppSettings>({ app_name: null, logo_url: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchAppSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("app_name, logo_url")
        .single();
      if (data) {
        setAppSettings({ app_name: data.app_name, logo_url: data.logo_url });
      }
    };
    fetchAppSettings();
  }, []);

  const navItems = useMemo(() => {
    const allItems = [
      { path: "/", icon: LayoutDashboard, label: "Dashboard", feature: null, adminOnly: true },
      { path: "/invoice", icon: ShoppingCart, label: "New Invoice", feature: "invoice", adminOnly: false },
      { path: "/inventory", icon: Package, label: "Inventory", feature: "inventory", adminOnly: false },
      { path: "/sales", icon: FileText, label: "Sales History", feature: "sales", adminOnly: false },
      { path: "/credits", icon: CreditCard, label: "Credits", feature: "credits", adminOnly: false },
      { path: "/receive-payment", icon: Banknote, label: "Receive Payment", feature: "receive_payment", adminOnly: false },
      { path: "/expenses", icon: Receipt, label: "Expenses", feature: "expenses", adminOnly: false },
      { path: "/customers", icon: Users, label: "Customers", feature: "customers", adminOnly: false },
      { path: "/workers", icon: UserCog, label: "Manage Workers", feature: null, adminOnly: true },
      { path: "/settings", icon: Settings, label: "Settings", feature: null, adminOnly: false },
    ];

    return allItems.filter(item => {
      if (userRole === "worker" && item.adminOnly) return false;
      if (item.feature) {
        return hasPermission(item.feature, "view");
      }
      if (item.adminOnly) {
        return userRole === "admin";
      }
      return true;
    });
  }, [userRole, hasPermission]);

  const currentTimezone = TIMEZONES.find(tz => tz.value === timezone);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* Modern Sidebar */}
        <aside 
          className={cn(
            "fixed left-0 top-0 z-40 h-screen border-r border-border/50 bg-sidebar transition-all duration-300 ease-smooth",
            sidebarCollapsed ? "w-[72px]" : "w-64",
            "hidden lg:block"
          )}
        >
          {/* Sidebar Header */}
          <div className={cn(
            "flex h-16 items-center border-b border-border/50 px-4",
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                {appSettings.logo_url ? (
                  <img 
                    src={appSettings.logo_url} 
                    alt="Logo" 
                    className="h-9 w-9 rounded-lg object-contain bg-background shadow-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
                    <Store className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                    {appSettings.app_name || "Business Manager"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-accent" />
                    <span className="text-[10px] text-muted-foreground">Pro Suite</span>
                  </div>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Tooltip key={item.path} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        style={{ animationDelay: `${index * 30}ms` }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 animate-fade-in group",
                          sidebarCollapsed && "justify-center px-2",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 shrink-0",
                          isActive 
                            ? "bg-primary-foreground/20" 
                            : "bg-transparent group-hover:bg-sidebar-accent"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {!sidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {isActive && !sidebarCollapsed && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    {sidebarCollapsed && (
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer - Collapse Toggle */}
          <div className="border-t border-border/50 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
                !sidebarCollapsed && "justify-start"
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <aside 
              className="absolute left-0 top-0 h-full w-64 border-r border-border/50 bg-sidebar shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Sidebar Header */}
              <div className="flex h-16 items-center border-b border-border/50 px-4">
                <div className="flex items-center gap-3">
                  {appSettings.logo_url ? (
                    <img 
                      src={appSettings.logo_url} 
                      alt="Logo" 
                      className="h-9 w-9 rounded-lg object-contain bg-background shadow-sm"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
                      <Store className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {appSettings.app_name || "Business Manager"}
                  </span>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 transition-all duration-300 ease-smooth",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}>
          {/* Modern Top Bar */}
          <header className="sticky top-0 z-30 border-b border-border/50 bg-card/80 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-4 lg:px-6">
              {/* Left - Search (Desktop) */}
              <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search anything..." 
                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 h-9"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Timezone Badge */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{currentTimezone?.label.split(')')[0]})</span>
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
                </Button>

                {/* User Info */}
                <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-foreground leading-none">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{userRole}</p>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Logout */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={signOut} 
                      variant="ghost" 
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Layout;