import { ReactNode, useMemo, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone, TIMEZONES } from "@/contexts/TimezoneContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard,
  Wallet,
  Store,
  Users,
  Settings,
  LogOut,
  UserCog,
  Banknote,
  Receipt,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Menu,
  AlertTriangle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import NotificationBell from "@/components/notifications/NotificationBell";
import SubscriptionActivatedPopup from "@/components/subscription/SubscriptionActivatedPopup";
import useSubscriptionNotification from "@/hooks/useSubscriptionNotification";

interface LayoutProps {
  children: ReactNode;
}

interface AppSettings {
  app_name: string | null;
  logo_url: string | null;
  description: string | null;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { userRole, signOut, user, hasPermission, subscriptionStatus } = useAuth();
  const { timezone } = useTimezone();
  const [appSettings, setAppSettings] = useState<AppSettings>({ app_name: null, logo_url: null, description: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Subscription activation popup
  const { showActivationPopup, setShowActivationPopup, subscriptionData } = useSubscriptionNotification();

  useEffect(() => {
    const fetchAppSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("app_name, logo_url, description")
        .single();
      if (data) {
        setAppSettings({ app_name: data.app_name, logo_url: data.logo_url, description: (data as any).description });
      }
    };
    fetchAppSettings();
  }, []);

  const navItems = useMemo(() => {
    const allItems = [
      { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", feature: null, adminOnly: true },
      { path: "/invoice", icon: ShoppingCart, label: "New Invoice", feature: "invoice", adminOnly: false },
      { path: "/inventory", icon: Package, label: "Inventory", feature: "inventory", adminOnly: false },
      { path: "/sales", icon: FileText, label: "Sales History", feature: "sales", adminOnly: false },
      { path: "/credits", icon: CreditCard, label: "Credits", feature: "credits", adminOnly: false },
      { path: "/credit-management", icon: Wallet, label: "Credit Management", feature: "credits", adminOnly: false },
      
      { path: "/receive-payment", icon: Banknote, label: "Receive Payment", feature: "receive_payment", adminOnly: false },
      { path: "/expenses", icon: Receipt, label: "Expenses", feature: "expenses", adminOnly: false },
      { path: "/customers", icon: Users, label: "Customers", feature: "customers", adminOnly: false },
      { path: "/workers", icon: UserCog, label: "Manage Workers", feature: null, adminOnly: true },
      { path: "/settings", icon: Settings, label: "Settings", feature: null, adminOnly: false },
    ];

    return allItems.filter(item => {
      if (userRole === "worker" && item.adminOnly) return false;
      if (item.feature) {
        // Special handling for items that require specific permissions
        if ((item as any).requirePermission === "create") {
          return hasPermission(item.feature, "create");
        }
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
                    className="max-w-[200px] max-h-12 rounded-lg object-contain"
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
                  {appSettings.description && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-accent" />
                      <span className="text-[10px] text-muted-foreground">{appSettings.description}</span>
                    </div>
                  )}
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
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/25"
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

          {/* Sidebar Footer - User Info & Logout */}
          <div className="border-t border-border/50 p-3 space-y-2">
            {/* User Info */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 bg-sidebar-accent/50",
                  sidebarCollapsed && "justify-center"
                )}>
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md shrink-0">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user?.email?.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="font-medium">
                  <p>{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Logout Button */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full text-sidebar-muted hover:text-destructive hover:bg-destructive/10",
                    sidebarCollapsed ? "justify-center px-2" : "justify-start"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && <span className="ml-2 text-xs">Logout</span>}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="font-medium">
                  Logout
                </TooltipContent>
              )}
            </Tooltip>

            {/* Collapse Toggle */}
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

        {/* Mobile Header - Simplified for app-like feel */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 border-b border-border/50 bg-card/95 backdrop-blur-xl flex items-center justify-center px-4 md:hidden safe-area-pt">
          <div className="flex items-center gap-2">
            {appSettings.logo_url ? (
              <img 
                src={appSettings.logo_url} 
                alt="Logo" 
                className="max-w-[100px] max-h-7 object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow">
                <Store className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">
              {appSettings.app_name || "Business Manager"}
            </span>
          </div>
        </div>

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
                      className="max-w-[200px] max-h-12 rounded-lg object-contain"
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
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/25"
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

              {/* Mobile Sidebar Footer - User Info & Logout */}
              <div className="border-t border-border/50 p-3 space-y-2">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2 bg-sidebar-accent/50">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                  </div>
                </div>
                <Button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sidebar-muted hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="text-xs">Logout</span>
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 transition-all duration-300 ease-smooth",
          "mt-14 mb-16 md:mt-0 md:mb-0", // Mobile: account for header and bottom nav
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-64"
        )}>
          {/* Modern Top Bar - Hidden on mobile */}
          <header className="sticky top-0 z-30 border-b border-border/50 bg-card/80 backdrop-blur-xl hidden md:block">
          <div className="flex h-16 items-center justify-end px-4 lg:px-6">

              {/* Right - Actions */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Notification Bell */}
                <NotificationBell />

                {/* Plan Status Badge */}
                {userRole === "admin" && subscriptionStatus && (
                  <div className={cn(
                    "hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium",
                    subscriptionStatus.is_expired 
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : subscriptionStatus.days_remaining !== null && subscriptionStatus.days_remaining <= 7
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                  )}>
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      subscriptionStatus.is_expired 
                        ? "bg-red-500"
                        : subscriptionStatus.days_remaining !== null && subscriptionStatus.days_remaining <= 7
                          ? "bg-amber-500 animate-pulse"
                          : "bg-blue-500"
                    )} />
                    {subscriptionStatus.is_expired 
                      ? "Expired"
                      : subscriptionStatus.days_remaining !== null && subscriptionStatus.days_remaining <= 7
                        ? `${subscriptionStatus.days_remaining} Days Left`
                        : "Active"
                    }
                  </div>
                )}

                {/* Timezone Badge */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{currentTimezone?.label.split(')')[0]})</span>
                </div>


              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6">
            {/* Subscription Warning Banner */}
            {userRole === "admin" && subscriptionStatus?.is_expired && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 animate-fade-in">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Subscription Expired</p>
                  <p className="text-sm text-red-600">Your subscription has expired. Please contact the administrator to renew your plan and regain access to all features.</p>
                </div>
              </div>
            )}
            {userRole === "admin" && subscriptionStatus && !subscriptionStatus.is_expired && subscriptionStatus.days_remaining !== null && subscriptionStatus.days_remaining <= 7 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 animate-fade-in">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Plan Expiring Soon</p>
                  <p className="text-sm text-amber-600">Your plan will expire in {subscriptionStatus.days_remaining} day{subscriptionStatus.days_remaining !== 1 ? 's' : ''}. Please renew to continue using all features.</p>
                </div>
              </div>
            )}
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Subscription Activated Popup */}
        <SubscriptionActivatedPopup
          open={showActivationPopup}
          onOpenChange={setShowActivationPopup}
          planName={subscriptionData?.planName}
          billingCycle={subscriptionData?.billingCycle}
          activationDate={subscriptionData?.activationDate}
          endDate={subscriptionData?.endDate || undefined}
        />
      </div>
    </TooltipProvider>
  );
};

export default Layout;