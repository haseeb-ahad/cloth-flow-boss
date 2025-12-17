import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Crown,
  DollarSign,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  duration_months: number;
  is_lifetime: boolean;
  is_active: boolean;
  trial_days: number;
  features: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;
  created_at: string;
}

const FEATURES = [
  "invoice",
  "inventory",
  "sales",
  "credits",
  "customers",
  "expenses",
  "receive_payment",
  "cash_credit",
  "workers",
];
const PERMISSIONS = ["view", "create", "edit", "delete"];

const FEATURE_LABELS: Record<string, string> = {
  invoice: "Invoices",
  inventory: "Inventory",
  sales: "Sales History",
  credits: "Credits",
  customers: "Customers",
  expenses: "Expenses",
  receive_payment: "Receive Payments",
  cash_credit: "Cash Credits (Udhar Diya)",
  workers: "Manage Workers",
};

const DEFAULT_FEATURES = FEATURES.reduce((acc, feature) => {
  acc[feature] = { view: true, create: true, edit: true, delete: true };
  return acc;
}, {} as Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>);

type DurationType = "days" | "months";

const SuperAdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthly_price: 0,
    yearly_price: 0,
    duration_value: 1,
    duration_type: "months" as DurationType,
    is_lifetime: false,
    is_active: true,
    features: DEFAULT_FEATURES,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_all_plans" },
      });
      if (error) throw error;
      setPlans(data.plans || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to fetch plans");
    }
    setIsLoading(false);
  };

  // Helper to convert duration_months to value and type
  const getDurationFromMonths = (months: number): { value: number; type: DurationType } => {
    // If less than 1 month (stored as decimal), treat as days
    if (months < 1) {
      const days = Math.round(months * 30);
      return { value: days || 1, type: "days" };
    }
    return { value: months, type: "months" };
  };

  // Helper to convert value and type to duration_months
  const getDurationMonths = (value: number, type: DurationType): number => {
    if (type === "days") {
      return value / 30; // Store as fraction of month
    }
    return value;
  };

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setFormData({
      name: "",
      description: "",
      monthly_price: 0,
      yearly_price: 0,
      duration_value: 1,
      duration_type: "months",
      is_lifetime: false,
      is_active: true,
      features: DEFAULT_FEATURES,
    });
    setEditDialog(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    const { value, type } = getDurationFromMonths(plan.duration_months);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      monthly_price: plan.monthly_price,
      yearly_price: plan.yearly_price,
      duration_value: value,
      duration_type: type,
      is_lifetime: plan.is_lifetime || false,
      is_active: plan.is_active,
      features: plan.features || DEFAULT_FEATURES,
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Plan name is required");
      return;
    }

    setIsSaving(true);
    try {
      const duration_months = getDurationMonths(formData.duration_value, formData.duration_type);
      const payload = {
        name: formData.name,
        description: formData.description,
        monthly_price: formData.monthly_price,
        yearly_price: formData.yearly_price,
        duration_months,
        is_lifetime: formData.is_lifetime,
        is_active: formData.is_active,
        features: formData.features,
      };

      if (selectedPlan) {
        await supabase.functions.invoke("super-admin", {
          body: {
            action: "update_plan",
            data: { id: selectedPlan.id, ...payload },
          },
        });
        toast.success("Plan updated successfully!");
      } else {
        await supabase.functions.invoke("super-admin", {
          body: { action: "create_plan", data: payload },
        });
        toast.success("Plan created successfully!");
      }
      setEditDialog(false);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to save plan");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setIsSaving(true);
    try {
      await supabase.functions.invoke("super-admin", {
        body: { action: "delete_plan", data: { id: selectedPlan.id } },
      });
      toast.success("Plan deleted successfully!");
      setDeleteDialog(false);
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    }
    setIsSaving(false);
  };

  const toggleFeature = (feature: string, permission: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: {
          ...prev.features[feature],
          [permission]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscription Plans</h2>
          <p className="text-slate-500">Create and manage subscription plans</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                !plan.is_active ? "opacity-60" : ""
              } ${plan.is_lifetime ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-white"}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plan.is_lifetime && <Crown className="w-5 h-5 text-amber-500" />}
                    <Badge
                      className={plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-blue-50"
                      onClick={() => handleOpenEdit(plan)}
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-red-50"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-xl mt-3">{plan.name}</CardTitle>
                <CardDescription>{plan.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {plan.is_lifetime ? "Free" : `Rs ${plan.monthly_price.toLocaleString()}`}
                  </span>
                  {!plan.is_lifetime && <span className="text-slate-500">/month</span>}
                </div>
                {!plan.is_lifetime && plan.yearly_price > 0 && (
                  <p className="text-sm text-slate-500">
                    or Rs {plan.yearly_price.toLocaleString()}/year
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {/* Duration Badge */}
                  <Badge className="bg-purple-100 text-purple-700">
                    {plan.duration_months < 1 
                      ? `${Math.round(plan.duration_months * 30)} Days` 
                      : `${plan.duration_months} ${plan.duration_months === 1 ? 'Month' : 'Months'}`}
                  </Badge>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Features ({Object.values(plan.features || {}).filter(f => f.view).length}/{FEATURES.length})</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {FEATURES.map((feature) => {
                      const featureData = plan.features?.[feature];
                      const hasAccess = featureData?.view || featureData?.create;
                      return (
                        <div key={feature} className="flex items-center gap-1.5">
                          {hasAccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span className={hasAccess ? "text-slate-700" : "text-slate-400"}>
                            {FEATURE_LABELS[feature] || feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Plan Card */}
          <Card
            className="border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group"
            onClick={handleOpenCreate}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 group-hover:text-blue-500 transition-colors">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-4">
                <Plus className="w-8 h-8" />
              </div>
              <p className="font-medium">Add New Plan</p>
              <p className="text-sm text-slate-400">Click to create a subscription plan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              {selectedPlan ? "Edit Plan" : "Create Plan"}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan ? "Update plan details and features" : "Create a new subscription plan"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Professional"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Plan Duration</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={formData.duration_value}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration_value: parseInt(e.target.value) || 1 }))
                  }
                  className="flex-1"
                  placeholder="e.g., 1, 7, 30"
                />
                <Select
                  value={formData.duration_type}
                  onValueChange={(value: DurationType) =>
                    setFormData((prev) => ({ ...prev, duration_type: value }))
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-500">Set plan duration in days or months (e.g., 1 day, 7 days, 1 month)</p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the plan"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Monthly Price (Rs)
                </Label>
                <Input
                  type="number"
                  value={formData.monthly_price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, monthly_price: parseFloat(e.target.value) || 0 }))
                  }
                  disabled={formData.is_lifetime}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Yearly Price (Rs)
                </Label>
                <Input
                  type="number"
                  value={formData.yearly_price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, yearly_price: parseFloat(e.target.value) || 0 }))
                  }
                  disabled={formData.is_lifetime}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_lifetime}
                  onCheckedChange={(checked) => setFormData((prev) => ({ 
                    ...prev, 
                    is_lifetime: checked,
                    monthly_price: checked ? 0 : prev.monthly_price,
                    yearly_price: checked ? 0 : prev.yearly_price,
                  }))}
                />
                <Label>Lifetime Free Plan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Feature Permissions</Label>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Feature</TableHead>
                      {PERMISSIONS.map((perm) => (
                        <TableHead key={perm} className="text-center capitalize font-semibold">
                          {perm}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FEATURES.map((feature) => (
                      <TableRow key={feature}>
                        <TableCell className="font-medium">{FEATURE_LABELS[feature] || feature}</TableCell>
                        {PERMISSIONS.map((perm) => (
                          <TableCell key={perm} className="text-center">
                            <Switch
                              checked={formData.features[feature]?.[perm as keyof typeof formData.features.invoice] || false}
                              onCheckedChange={(checked) => toggleFeature(feature, perm, checked)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {isSaving ? "Saving..." : selectedPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPlan?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminPlans;
