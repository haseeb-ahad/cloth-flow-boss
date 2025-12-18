import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  CreditCard,
  Crown,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  Zap,
  Wallet,
  Smartphone,
  Lock,
  Shield,
  ArrowRight,
  Sparkles,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import UpgradePlanPopup from "./UpgradePlanPopup";
import UserPaymentStatus from "./UserPaymentStatus";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  is_lifetime: boolean;
  features: Record<string, any>;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  billing_cycle: string;
  auto_renew: boolean;
  plans?: Plan;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  transaction_id: string | null;
}

const PAYMENT_METHODS = [
  { value: "card", label: "Credit/Debit Card", icon: CreditCard, color: "bg-blue-500" },
  { value: "nayapay", label: "NayaPay", icon: Wallet, color: "bg-purple-500" },
  { value: "jazzcash", label: "JazzCash", icon: Smartphone, color: "bg-red-500" },
  { value: "easypaisa", label: "EasyPaisa", icon: Smartphone, color: "bg-emerald-500" },
];

const StoreAdminBilling = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradePopup, setUpgradePopup] = useState(false);

  // Purchase dialog state
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const isExpired = subscription?.end_date && isPast(new Date(subscription.end_date));

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price", { ascending: true });
      setPlans((plansData as any) || []);

      // Fetch subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("admin_id", user?.id)
        .single();
      setSubscription(subData as any);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("admin_id", user?.id)
        .order("created_at", { ascending: false });
      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching billing data:", error);
    }
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === "card" && (!cardNumber || !cardExpiry || !cardCvv)) {
      toast.error("Please fill in all card details");
      return;
    }

    if (["nayapay", "jazzcash", "easypaisa"].includes(paymentMethod) && !accountNumber) {
      toast.error("Please enter your account number");
      return;
    }

    setIsProcessing(true);
    setPaymentError("");

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const amount = billingCycle === "yearly" ? selectedPlan.yearly_price : selectedPlan.monthly_price;

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        admin_id: user?.id,
        amount,
        payment_method: paymentMethod,
        status: "success",
        transaction_id: `TXN${Date.now()}`,
        card_last_four: paymentMethod === "card" ? cardNumber.slice(-4) : null,
      });

      if (paymentError) throw paymentError;

      // Create/Update subscription
      const endDate = new Date();
      if (billingCycle === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      if (subscription) {
        await supabase
          .from("subscriptions")
          .update({
            plan_id: selectedPlan.id,
            status: "active",
            billing_cycle: billingCycle,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            amount_paid: amount,
          })
          .eq("id", subscription.id);
      } else {
        await supabase.from("subscriptions").insert({
          admin_id: user?.id,
          plan_id: selectedPlan.id,
          status: "active",
          billing_cycle: billingCycle,
          end_date: endDate.toISOString(),
          amount_paid: amount,
        });
      }

      setPaymentSuccess(true);
      toast.success("Payment successful! Your plan is now active.");
      fetchData();
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
    }
    setIsProcessing(false);
  };

  const handleAutoRenewToggle = async (value: boolean) => {
    if (!subscription) return;
    try {
      await supabase
        .from("subscriptions")
        .update({ auto_renew: value })
        .eq("id", subscription.id);
      setSubscription((prev) => prev && { ...prev, auto_renew: value });
      toast.success(value ? "Auto-renewal enabled" : "Auto-renewal disabled");
    } catch (error) {
      console.error("Error updating auto-renew:", error);
      toast.error("Failed to update setting");
    }
  };

  const resetPurchaseDialog = () => {
    setPurchaseDialog(false);
    setSelectedPlan(null);
    setPaymentMethod("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setAccountNumber("");
    setPaymentSuccess(false);
    setPaymentError("");
  };

  const currentPlan = subscription?.plans || plans.find((p) => p.is_lifetime);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Expired Plan Warning */}
      {isExpired && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-900">Your Plan Has Expired</p>
                  <p className="text-sm text-red-700">Upgrade now to continue using all features</p>
                </div>
              </div>
              <Button
                onClick={() => setUpgradePopup(true)}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                Renew Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Status */}
      <UserPaymentStatus />

      {/* Current Plan Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            {subscription?.status === "active" && !isExpired ? (
              <Badge className="bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700">
                <XCircle className="w-3 h-3 mr-1" />
                Expired
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{currentPlan?.name || "Free"}</h3>
              <p className="text-slate-500">{currentPlan?.description || "Basic features"}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">
                Rs {(currentPlan?.monthly_price || 0).toLocaleString()}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
            </div>
          </div>

          {subscription?.end_date && (
            <div className="flex items-center gap-6 p-4 rounded-xl bg-white/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-slate-600'}`}>
                  {isExpired ? 'Expired' : 'Expires'}: {format(new Date(subscription.end_date), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={subscription.auto_renew}
                  onCheckedChange={handleAutoRenewToggle}
                />
                <span className="text-sm text-slate-600">Auto-renew</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => setUpgradePopup(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25"
            >
              <Zap className="w-4 h-4 mr-2" />
              {isExpired ? 'Renew Plan' : 'Upgrade Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plan Popup */}
      <UpgradePlanPopup
        open={upgradePopup}
        onOpenChange={setUpgradePopup}
        onSuccess={fetchData}
      />

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans
            .filter((p) => !p.is_lifetime)
            .map((plan) => (
              <Card
                key={plan.id}
                className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  currentPlan?.id === plan.id ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => {
                  setSelectedPlan(plan);
                  setPurchaseDialog(true);
                }}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-slate-900">
                      Rs {plan.monthly_price.toLocaleString()}
                    </span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <Button className="w-full" variant={currentPlan?.id === plan.id ? "secondary" : "default"}>
                    {currentPlan?.id === plan.id ? "Current Plan" : "Select Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Payment History */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Payment History
          </CardTitle>
          <CardDescription>Your recent transactions and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>No payment history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        Rs {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(payment.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="capitalize">
                      {payment.payment_method}
                    </Badge>
                    <Badge
                      className={
                        payment.status === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {payment.status}
                    </Badge>
                    <Button size="sm" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialog} onOpenChange={resetPurchaseDialog}>
        <DialogContent className="sm:max-w-lg">
          {paymentSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
              <p className="text-slate-500 mb-6">
                Your {selectedPlan?.name} plan is now active.
              </p>
              <Button onClick={resetPurchaseDialog} className="bg-gradient-to-r from-blue-500 to-purple-600">
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Purchase Plan
                </DialogTitle>
                <DialogDescription>
                  Complete your subscription to {selectedPlan?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Plan Summary */}
                <div className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-900">{selectedPlan?.name}</span>
                    <Badge variant="secondary">{billingCycle}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total</span>
                    <span className="text-2xl font-bold text-slate-900">
                      Rs{" "}
                      {(billingCycle === "yearly"
                        ? selectedPlan?.yearly_price
                        : selectedPlan?.monthly_price
                      )?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={billingCycle === "monthly" ? "default" : "outline"}
                      onClick={() => setBillingCycle("monthly")}
                      className="h-12"
                    >
                      Monthly
                    </Button>
                    <Button
                      variant={billingCycle === "yearly" ? "default" : "outline"}
                      onClick={() => setBillingCycle("yearly")}
                      className="h-12"
                    >
                      Yearly (Save 20%)
                    </Button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.value}
                          variant={paymentMethod === method.value ? "default" : "outline"}
                          onClick={() => setPaymentMethod(method.value)}
                          className="h-12 justify-start"
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {method.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Details */}
                {paymentMethod === "card" && (
                  <div className="space-y-3 p-4 rounded-xl border bg-slate-50">
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Expiry</Label>
                        <Input
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <Input
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          type="password"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {["nayapay", "jazzcash", "easypaisa"].includes(paymentMethod) && (
                  <div className="space-y-2 p-4 rounded-xl border bg-slate-50">
                    <Label>Account Number</Label>
                    <Input
                      placeholder="03XX XXXXXXX"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                )}

                {paymentError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">{paymentError}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetPurchaseDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={isProcessing || !paymentMethod}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Pay Rs{" "}
                      {(billingCycle === "yearly"
                        ? selectedPlan?.yearly_price
                        : selectedPlan?.monthly_price
                      )?.toLocaleString()}
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreAdminBilling;
