import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Crown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  plan: string;
  plan_status: "active" | "expired" | "free";
  amount_paid: number;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    // Check if super admin is authenticated
    const isAuth = localStorage.getItem("superAdminAuth");
    if (!isAuth) {
      navigate("/super-admin-login");
      return;
    }

    fetchAdmins();
  }, [navigate]);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "admin");

      if (rolesData) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, created_at")
          .in("user_id", rolesData.map((r) => r.user_id));

        if (profilesData) {
          const formattedAdmins: AdminUser[] = profilesData.map((profile) => ({
            id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            created_at: profile.created_at || "",
            plan: "Free",
            plan_status: "free" as const,
            amount_paid: 0,
          }));
          setAdmins(formattedAdmins);
        }
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("superAdminAuth");
    navigate("/super-admin-login");
  };

  // Mock stats - In production, these would come from the database
  const stats = {
    totalAdmins: admins.length,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
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
                {trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    trend === "up" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {trendValue}
                </span>
                <span className="text-sm text-slate-400">vs last month</span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-xl ${color}`}
          >
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
              <Button variant="ghost" size="sm" className="text-slate-600">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
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
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 p-1 rounded-xl shadow-sm">
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
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Stats Grid */}
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
              {/* Quick Actions */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                    <Crown className="w-4 h-4 mr-3" />
                    Assign Free Plan
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                    onClick={() => setActiveTab("admins")}
                  >
                    <Users className="w-4 h-4 mr-3" />
                    View All Admins
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Signups */}
              <Card className="border-0 shadow-sm bg-white lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      Recent Signups
                    </CardTitle>
                    <CardDescription>Latest store admin registrations</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("admins")}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
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
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          >
                            Free
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Store Admins Management</CardTitle>
                <CardDescription>Manage all registered store administrators</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : admins.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-medium">No Store Admins Yet</p>
                    <p className="text-sm">Store admins will appear here after they sign up</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                            Admin
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                            Plan
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((admin) => (
                          <tr
                            key={admin.id}
                            className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                                  {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-900">
                                  {admin.full_name || "Unnamed"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{admin.email}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="bg-slate-100">
                                {admin.plan}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={`${
                                  admin.plan_status === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : admin.plan_status === "expired"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {admin.plan_status === "active" && (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                )}
                                {admin.plan_status === "expired" && (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                {admin.plan_status === "free" && <Crown className="w-3 h-3 mr-1" />}
                                {admin.plan_status.charAt(0).toUpperCase() +
                                  admin.plan_status.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="h-8">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Assign Plan
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8">
                                  <Settings className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Subscription Plans</h2>
                <p className="text-slate-500">Create and manage subscription plans</p>
              </div>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">
                <Package className="w-4 h-4 mr-2" />
                Create Plan
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Free Plan Card */}
              <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-100 text-emerald-700">Lifetime</Badge>
                    <Crown className="w-5 h-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-xl mt-2">Free Plan</CardTitle>
                  <CardDescription>Basic features for getting started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-slate-900">
                    Rs 0<span className="text-sm font-normal text-slate-500">/forever</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Basic Invoicing</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Inventory Management</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <XCircle className="w-4 h-4" />
                      <span>Advanced Reports</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Features
                  </Button>
                </CardContent>
              </Card>

              {/* Add Plan Card */}
              <Card className="border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 group-hover:text-blue-500 transition-colors">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-4">
                    <Package className="w-8 h-8" />
                  </div>
                  <p className="font-medium">Add New Plan</p>
                  <p className="text-sm text-slate-400">Click to create a subscription plan</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
                <CardDescription>View all subscription payments and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500">
                  <CreditCard className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium">No Payments Yet</p>
                  <p className="text-sm">Payments will appear here when store admins subscribe</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
