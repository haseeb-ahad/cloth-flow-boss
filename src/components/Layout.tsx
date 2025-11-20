import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard,
  Store,
  CalendarClock
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/invoice", icon: ShoppingCart, label: "New Invoice" },
    { path: "/inventory", icon: Package, label: "Inventory" },
    { path: "/sales", icon: FileText, label: "Sales History" },
    { path: "/credits", icon: CreditCard, label: "Credits" },
    { path: "/installments", icon: CalendarClock, label: "Installments" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Cloth Shop Manager</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto flex gap-6 p-4">
        <aside className="w-64 space-y-2">
          <div className="rounded-lg bg-card p-4 shadow-sm">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1">
          <div className="rounded-lg bg-card p-6 shadow-sm">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
