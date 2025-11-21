import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard,
  Store
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
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header with Glass Effect */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">Cloth Shop Manager</span>
                <span className="text-xs text-muted-foreground">Business Management Suite</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto flex gap-6 p-6">
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
