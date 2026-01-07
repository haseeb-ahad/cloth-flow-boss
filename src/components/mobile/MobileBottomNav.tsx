import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard,
  Wallet,
  Users,
  Settings,
  UserCog,
  Banknote,
  Receipt,
  MoreHorizontal
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const MobileBottomNav = () => {
  const location = useLocation();
  const { userRole, hasPermission } = useAuth();

  const allNavItems = useMemo(() => {
    const items = [
      { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", feature: null, adminOnly: true },
      { path: "/invoice", icon: ShoppingCart, label: "Invoice", feature: "invoice", adminOnly: false },
      { path: "/inventory", icon: Package, label: "Inventory", feature: "inventory", adminOnly: false },
      { path: "/sales", icon: FileText, label: "Sales", feature: "sales", adminOnly: false },
      { path: "/credits", icon: CreditCard, label: "Credits", feature: "credits", adminOnly: false },
      { path: "/credit-management", icon: Wallet, label: "Credit Mgmt", feature: "credits", adminOnly: false },
      { path: "/receive-payment", icon: Banknote, label: "Payments", feature: "receive_payment", adminOnly: false },
      { path: "/expenses", icon: Receipt, label: "Expenses", feature: "expenses", adminOnly: false },
      { path: "/customers", icon: Users, label: "Customers", feature: "customers", adminOnly: false },
      { path: "/workers", icon: UserCog, label: "Workers", feature: null, adminOnly: true },
      { path: "/settings", icon: Settings, label: "Settings", feature: null, adminOnly: false },
    ];

    return items.filter(item => {
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

  // Show first 4 items in bottom nav, rest in "More" sheet
  const mainNavItems = allNavItems.slice(0, 4);
  const moreNavItems = allNavItems.slice(4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 rounded-lg transition-all duration-200 min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-primary/10 scale-110" 
                  : "bg-transparent"
              )}>
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 truncate max-w-full",
                isActive && "text-primary font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {moreNavItems.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full py-2 px-1 rounded-lg transition-all duration-200 text-muted-foreground min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl">
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium mt-0.5">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-4 gap-4 pb-8">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex flex-col items-center justify-center py-4 px-2 rounded-2xl transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-2xl mb-2",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center",
                        isActive && "font-semibold"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
