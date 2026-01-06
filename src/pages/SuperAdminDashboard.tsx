import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Shield,
  LogOut,
  Settings,
  Package,
  BarChart3,
  Zap,
  ArrowUpRight,
  UserPlus,
  CheckCircle2,
  Building2,
  FileCheck,
  Type,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminAdmins from "@/components/super-admin/SuperAdminAdmins";
import SuperAdminPlans from "@/components/super-admin/SuperAdminPlans";
import SuperAdminPayments from "@/components/super-admin/SuperAdminPayments";
import SuperAdminBankSettings from "@/components/super-admin/SuperAdminBankSettings";
import SuperAdminPaymentRequests from "@/components/super-admin/SuperAdminPaymentRequests";
import SuperAdminLoaderSettings from "@/components/super-admin/SuperAdminLoaderSettings";
import SuperAdminSettings from "@/components/super-admin/SuperAdminSettings";
import SuperAdminNotificationBell from "@/components/notifications/SuperAdminNotificationBell";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  store_name: string | null;
  subscription: {
    status: string;
    amount_paid: number;
    end_date: string | null;
    is_trial: boolean;
  } | null;
  plan: {
    name: string;
  } | null;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [superAdminUserId, setSuperAdminUserId] = useState<string>("");
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    const isAuth = localStorage.getItem("superAdminAuth");
    if (!isAuth) {
      navigate("/super-admin-login");
      return;
    }
    
    // Auto-generate super admin user ID if not exists and save to DB
    const initSuperAdminId = async () => {
      let storedUserId = localStorage.getItem("superAdminUserId");
      if (!storedUserId) {
        storedUserId = crypto.randomUUID();
        localStorage.setItem("superAdminUserId", storedUserId);
      }
      setSuperAdminUserId(storedUserId);
      
      // Save to database via edge function
      try {
        await supabase.functions.invoke("super-admin", {
          body: { action: "save_super_admin_id", data: { super_admin_id: storedUserId } }
        });
      } catch (error) {
        console.error("Error saving super admin ID:", error);
      }
    };
    
    initSuperAdminId();
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_all_admins" },
      });

      if (error) throw error;

      const adminsList = data?.admins || [];
      setAdmins(adminsList);

      // Count only truly active subscriptions (not expired based on end_date)
      const activeCount = adminsList.filter((a: AdminUser) => {
        if (!a.subscription) return false;
        const status = a.subscription.status;
        const endDate = a.subscription.end_date;
        const isExpired = endDate && new Date(endDate) < new Date();
        
        // Only count as active if status is active AND not expired
        return status === "active" && !isExpired;
      }).length;
      const totalRevenue = adminsList.reduce(
        (sum: number, a: AdminUser) => sum + (a.subscription?.amount_paid || 0),
        0
      );

      setStats({
        totalAdmins: adminsList.length,
        activeSubscriptions: activeCount,
        monthlyRevenue: totalRevenue,
        pendingPayments: 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("superAdminAuth");
    navigate("/super-admin-login");
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: "up" | "down";
    trendValue?: string;
    color: string;
  }) => (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {trendValue && (
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">{trendValue}</span>
                <span className="text-sm text-slate-400">vs last month</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Super Admin</h1>
                <p className="text-xs text-slate-500">System Control Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              {superAdminUserId && (
                <SuperAdminNotificationBell superAdminUserId={superAdminUserId} />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 p-1 rounded-xl shadow-sm flex-wrap h-auto">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <Users className="w-4 h-4 mr-2" />
              Admins
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <Package className="w-4 h-4 mr-2" />
              Plans
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="payment-requests"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Bank Transfers
            </TabsTrigger>
            <TabsTrigger
              value="bank-settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Bank Settings
            </TabsTrigger>
            <TabsTrigger
              value="loader-settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <Type className="w-4 h-4 mr-2" />
              Loader Logo
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Store Admins"
                value={stats.totalAdmins}
                icon={Users}
                trend="up"
                trendValue="12%"
                color="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <StatCard
                title="Active Subscriptions"
                value={stats.activeSubscriptions}
                icon={CheckCircle2}
                trend="up"
                trendValue="8%"
                color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              />
              <StatCard
                title="Monthly Revenue"
                value={`Rs ${stats.monthlyRevenue.toLocaleString()}`}
                icon={TrendingUp}
                trend="up"
                trendValue="24%"
                color="bg-gradient-to-br from-purple-500 to-purple-600"
              />
              <StatCard
                title="Pending Payments"
                value={stats.pendingPayments}
                icon={AlertCircle}
                color="bg-gradient-to-br from-amber-500 to-amber-600"
              />
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm bg-white">
                <div className="p-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                      onClick={() => setActiveTab("plans")}
                    >
                      <Package className="w-4 h-4 mr-3" />
                      Create New Plan
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 border-slate-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
                      onClick={() => setActiveTab("admins")}
                    >
                      <Users className="w-4 h-4 mr-3" />
                      Manage Admins
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                      onClick={() => setActiveTab("payments")}
                    >
                      <CreditCard className="w-4 h-4 mr-3" />
                      View Payments
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="border-0 shadow-sm bg-white lg:col-span-2">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      Recent Signups
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("admins")}>
                      View All
                    </Button>
                  </div>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <AnimatedLogoLoader size="sm" />
                    </div>
                  ) : admins.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p>No store admins registered yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {admins.slice(0, 5).map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {admin.full_name || "Unnamed"}
                              </p>
                              <p className="text-sm text-slate-500">{admin.email}</p>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            {admin.plan?.name || "Free"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins">
            <SuperAdminAdmins />
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <SuperAdminPlans />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <SuperAdminPayments />
          </TabsContent>

          {/* Payment Requests Tab */}
          <TabsContent value="payment-requests">
            <SuperAdminPaymentRequests />
          </TabsContent>

          {/* Bank Settings Tab */}
          <TabsContent value="bank-settings">
            <SuperAdminBankSettings />
          </TabsContent>

          {/* Loader Settings Tab */}
          <TabsContent value="loader-settings">
            <SuperAdminLoaderSettings />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SuperAdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
