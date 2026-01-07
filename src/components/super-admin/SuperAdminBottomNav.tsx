import { 
  BarChart3, 
  Users, 
  Package, 
  CreditCard, 
  Settings,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileCheck, Building2, Type } from "lucide-react";

interface SuperAdminBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SuperAdminBottomNav = ({ activeTab, onTabChange }: SuperAdminBottomNavProps) => {
  const mainTabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "admins", label: "Admins", icon: Users },
    { id: "plans", label: "Plans", icon: Package },
    { id: "payments", label: "Payments", icon: CreditCard },
  ];

  const moreTabs = [
    { id: "payment-requests", label: "Bank Transfers", icon: FileCheck },
    { id: "bank-settings", label: "Bank Settings", icon: Building2 },
    { id: "loader-settings", label: "Loader Logo", icon: Type },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const isMoreActive = moreTabs.some(tab => tab.id === activeTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-pb md:hidden">
      <nav className="flex items-center justify-around h-16 px-2">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-colors ${
                isActive 
                  ? "text-blue-600" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                isActive ? "bg-blue-100" : ""
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium mt-0.5 truncate max-w-[60px]">
                {tab.label}
              </span>
            </button>
          );
        })}
        
        {/* More dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-colors ${
                isMoreActive 
                  ? "text-blue-600" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                isMoreActive ? "bg-blue-100" : ""
              }`}>
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium mt-0.5">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="top" 
            sideOffset={8}
            className="w-48 mb-2"
          >
            {moreTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-3 cursor-pointer ${
                    isActive ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
};

export default SuperAdminBottomNav;
