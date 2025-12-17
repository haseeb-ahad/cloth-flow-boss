import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Crown,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
  store_name: string | null;
  subscription: {
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    amount_paid: number;
    billing_cycle: string;
    is_trial: boolean;
  } | null;
  plan: {
    id: string;
    name: string;
    features: Record<string, any>;
    trial_days: number;
    is_lifetime: boolean;
  } | null;
}

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  is_lifetime: boolean;
  trial_days: number;
}

const SuperAdminAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [assignPlanDialog, setAssignPlanDialog] = useState(false);
  const [paymentHistoryDialog, setPaymentHistoryDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState("lifetime");
  const [payments, setPayments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_all_admins" },
      });
      if (error) throw error;
      setAdmins(data.admins || []);

      const { data: plansData } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_all_plans" },
      });
      setPlans(plansData?.plans || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to fetch admins");
    }
    setIsLoading(false);
  };

  const handleAssignPlan = async () => {
    if (!selectedAdmin || !selectedPlan) return;
    setIsSaving(true);
    try {
      const plan = plans.find((p) => p.id === selectedPlan);
      let amount = 0;
      let is_trial = false;
      
      if (billingCycle === "yearly") {
        amount = plan?.yearly_price || 0;
      } else if (billingCycle === "monthly") {
        amount = plan?.monthly_price || 0;
      } else if (billingCycle === "trial") {
        is_trial = true;
        amount = 0;
      }

      await supabase.functions.invoke("super-admin", {
        body: {
          action: "assign_subscription",
          data: {
            admin_id: selectedAdmin.id,
            plan_id: selectedPlan,
            billing_cycle: billingCycle,
            amount_paid: amount,
            is_trial,
            trial_days: plan?.trial_days || 7,
          },
        },
      });
      toast.success("Plan assigned successfully!");
      setAssignPlanDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error assigning plan:", error);
      toast.error("Failed to assign plan");
    }
    setIsSaving(false);
  };

  const handleViewPayments = async (admin: AdminUser) => {
    setSelectedAdmin(admin);
    try {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("admin_id", admin.id)
        .order("created_at", { ascending: false });
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
    setPaymentHistoryDialog(true);
  };

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.store_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const status = admin.subscription?.status || "free";
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (admin: AdminUser) => {
    const status = admin.subscription?.status || "free";
    const isTrial = admin.subscription?.is_trial;
    const endDate = admin.subscription?.end_date;
    const isExpired = endDate && new Date(endDate) < new Date();
    
    // Check if trial/subscription is expired
    if (isExpired && status !== "free") {
      return (
        <Badge className="bg-red-100 text-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    
    if (isTrial) {
      const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      return (
        <Badge className="bg-amber-100 text-amber-700">
          <Clock className="w-3 h-3 mr-1" />
          Trial ({daysLeft} days left)
        </Badge>
      );
    }

    const configs: Record<string, { className: string; icon: React.ElementType; label: string }> = {
      active: { className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Active" },
      expired: { className: "bg-red-100 text-red-700", icon: XCircle, label: "Expired" },
      free: { className: "bg-blue-100 text-blue-700", icon: Crown, label: "Free Lifetime" },
      cancelled: { className: "bg-slate-100 text-slate-700", icon: Clock, label: "Cancelled" },
    };
    const config = configs[status] || configs.free;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Store Admins Management
            </CardTitle>
            <CardDescription>Manage all registered store administrators</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium">No Store Admins Found</p>
            <p className="text-sm">Store admins will appear here after they sign up</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Admin</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                          {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {admin.full_name || "Unnamed"}
                          </p>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {admin.store_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100">
                        {admin.plan?.name || "No Plan"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(admin)}</TableCell>
                    <TableCell className="text-slate-600">
                      Rs {(admin.subscription?.amount_paid || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {admin.subscription?.start_date ? (
                        <div>
                          <span>{format(new Date(admin.subscription.start_date), "MMM d, yyyy")}</span>
                          {admin.subscription.end_date && (
                            <>
                              <span className="mx-1">→</span>
                              <span>{format(new Date(admin.subscription.end_date), "MMM d, yyyy")}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setAssignPlanDialog(true);
                          }}
                          title="Assign Plan"
                        >
                          <Crown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 hover:bg-emerald-50 hover:text-emerald-600"
                          onClick={() => handleViewPayments(admin)}
                          title="Payment History"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Assign Plan Dialog */}
      <Dialog open={assignPlanDialog} onOpenChange={setAssignPlanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Assign Plan
            </DialogTitle>
            <DialogDescription>
              Assign a subscription plan to {selectedAdmin?.full_name || selectedAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} 
                      {plan.is_lifetime ? " (Lifetime Free)" : ` - Rs ${plan.monthly_price}/mo`}
                      {plan.trial_days > 0 && ` (${plan.trial_days} day trial)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifetime">Lifetime (Free Forever)</SelectItem>
                  <SelectItem value="trial">Free Trial</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {billingCycle === "trial" && (
                <p className="text-xs text-amber-600">User will get trial days as per plan settings. After trial expires, access will be restricted.</p>
              )}
              {billingCycle === "lifetime" && (
                <p className="text-xs text-blue-600">User will have permanent free access with all plan features.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignPlanDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={!selectedPlan || isSaving}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {isSaving ? "Assigning..." : "Assign Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={paymentHistoryDialog} onOpenChange={setPaymentHistoryDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Payment History
            </DialogTitle>
            <DialogDescription>
              Payment history for {selectedAdmin?.full_name || selectedAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>No payments found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50"
                  >
                    <div>
                      <p className="font-medium">Rs {payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(payment.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="capitalize">
                        {payment.payment_method}
                      </Badge>
                      <Badge
                        className={
                          payment.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : payment.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SuperAdminAdmins;
