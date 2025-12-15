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
  Store,
  Users,
  Settings,
  LogOut,
  UserCog,
  Banknote,
  Receipt,
  Clock
} from "lucide-react";

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

    // Filter items based on role and permissions
    return allItems.filter(item => {
      // Workers don't see admin-only items
      if (userRole === "worker" && item.adminOnly) return false;
      
      // Check feature permissions for both admins and workers
      if (item.feature) {
        return hasPermission(item.feature, "view");
      }
      
      // Non-feature items (dashboard, settings, manage workers) follow admin-only rule
      if (item.adminOnly) {
        return userRole === "admin";
      }
      
      // Settings is visible to all
      return true;
    });
  }, [userRole, hasPermission]);

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header with Glass Effect */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="px-5">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {appSettings.logo_url ? (
                <img 
                  src={appSettings.logo_url} 
                  alt="Logo" 
                  className="h-10 w-10 rounded-xl object-contain bg-white"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
                  <Store className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">
                  {appSettings.app_name || "Business Manager"}
                </span>
                <span className="text-xs text-muted-foreground">Business Management Suite</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                <Clock className="h-3 w-3" />
                {TIMEZONES.find(tz => tz.value === timezone)?.label.split(')')[0]}){" "}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole} Account</p>
              </div>
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex gap-6 p-5">
        {/* Modern Sidebar with Animations */}
        <aside className="w-72 space-y-2">
          <div className="rounded-xl bg-card border border-border/50 p-4 shadow-lg animate-in">
            <nav className="space-y-1.5">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 animate-fade-in",
                      "hover:translate-x-1",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                      isActive ? "bg-primary-foreground/20" : "bg-muted"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content with Modern Card */}
        <main className="flex-1">
          <div className="rounded-xl bg-card border border-border/50 p-8 shadow-lg animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
