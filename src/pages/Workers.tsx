import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users, Trash2, Edit, Plus, Mail, Phone, User, Lock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface Worker {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string;
}

interface Permission {
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const FEATURES = ["invoice", "inventory", "sales", "credits", "customers", "expenses", "receive_payment"];

const FEATURE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  inventory: "Inventory",
  sales: "Sales",
  credits: "Credits",
  customers: "Customers",
  expenses: "Expenses",
  receive_payment: "Receive Payment",
};

const workerSchema = z.object({
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Workers() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({
    email: "",
    phoneNumber: "",
    fullName: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creatingWorker, setCreatingWorker] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      loadWorkers();
    }
  }, [userRole]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      // Get current admin's user id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Only fetch workers created by THIS admin (admin_id = current user's id)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "worker")
        .eq("admin_id", user.id);

      if (rolesError) throw rolesError;

      const workerIds = rolesData?.map((r) => r.user_id) || [];
      if (workerIds.length === 0) {
        setWorkers([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", workerIds);

      if (profilesError) throw profilesError;

      setWorkers(
        profilesData?.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          email: p.email,
          full_name: p.full_name || "",
          phone_number: p.phone_number || "",
        })) || []
      );
    } catch (error) {
      console.error("Error loading workers:", error);
      toast.error("Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerPermissions = async (workerId: string) => {
    try {
      const { data, error } = await supabase
        .from("worker_permissions")
        .select("*")
        .eq("worker_id", workerId);

      if (error) throw error;

      const permsMap: Record<string, Permission> = {};
      FEATURES.forEach((feature) => {
        const perm = data?.find((p) => p.feature === feature);
        permsMap[feature] = perm || {
          feature,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
      });
      setPermissions(permsMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load permissions");
    }
  };

  const handleEditPermissions = (worker: Worker) => {
    setSelectedWorker(worker);
    loadWorkerPermissions(worker.user_id);
    setPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedWorker) return;

    setLoading(true);
    try {
      // Delete existing permissions
      await supabase
        .from("worker_permissions")
        .delete()
        .eq("worker_id", selectedWorker.user_id);

      // Insert new permissions
      const permsToInsert = Object.values(permissions).map((p) => ({
        worker_id: selectedWorker.user_id,
        feature: p.feature,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      }));

      const { error } = await supabase
        .from("worker_permissions")
        .insert(permsToInsert);

      if (error) throw error;

      toast.success("Permissions updated successfully!");
      setPermissionsDialogOpen(false);
      setSelectedWorker(null);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast.error(error.message || "Failed to save permissions");
    } finally {
      setLoading(false);
    }
  };

  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null);

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm("Are you sure you want to delete this worker?")) return;
    
    // Prevent double-click
    if (deletingWorkerId === workerId) return;

    setDeletingWorkerId(workerId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("delete-worker", {
        body: { workerId },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      // Update the workers list immediately by filtering out the deleted worker
      setWorkers((prevWorkers) => prevWorkers.filter((w) => w.user_id !== workerId));
      toast.success("Worker deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting worker:", error);
      toast.error(error.message || "Failed to delete worker");
    } finally {
      setDeletingWorkerId(null);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate
    const result = workerSchema.safeParse(newWorker);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    setCreatingWorker(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Use edge function to create worker without affecting admin session
      const response = await supabase.functions.invoke("create-worker", {
        body: {
          email: newWorker.email,
          password: newWorker.password,
          phoneNumber: newWorker.phoneNumber,
          fullName: newWorker.fullName,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Worker created successfully! They can now login with their credentials.");
      setAddWorkerOpen(false);
      setNewWorker({ email: "", phoneNumber: "", fullName: "", password: "" });
      
      // Reload workers after a short delay to allow the trigger to complete
      setTimeout(() => {
        loadWorkers();
      }, 1000);
    } catch (error: any) {
      console.error("Error creating worker:", error);
      toast.error(error.message || "Failed to create worker");
    } finally {
      setCreatingWorker(false);
    }
  };

  const togglePermission = (feature: string, permType: "can_view" | "can_create" | "can_edit" | "can_delete") => {
    setPermissions({
      ...permissions,
      [feature]: {
        ...permissions[feature],
        [permType]: !permissions[feature]?.[permType],
      },
    });
  };

  if (userRole !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">Only admins can manage workers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message="Loading workers..." />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Manage Workers</h1>
        </div>
        <Dialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Worker</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workerFullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerFullName"
                    type="text"
                    placeholder="Enter full name"
                    className="pl-10"
                    value={newWorker.fullName}
                    onChange={(e) => setNewWorker({ ...newWorker, fullName: e.target.value })}
                    disabled={creatingWorker}
                  />
                </div>
                {formErrors.fullName && <p className="text-sm text-destructive">{formErrors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workerEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerEmail"
                    type="email"
                    placeholder="Enter email"
                    className="pl-10"
                    value={newWorker.email}
                    onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                    disabled={creatingWorker}
                  />
                </div>
                {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workerPhone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerPhone"
                    type="tel"
                    placeholder="Enter phone number"
                    className="pl-10"
                    value={newWorker.phoneNumber}
                    onChange={(e) => setNewWorker({ ...newWorker, phoneNumber: e.target.value })}
                    disabled={creatingWorker}
                  />
                </div>
                {formErrors.phoneNumber && <p className="text-sm text-destructive">{formErrors.phoneNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workerPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerPassword"
                    type="password"
                    placeholder="Create a password"
                    className="pl-10"
                    value={newWorker.password}
                    onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                    disabled={creatingWorker}
                  />
                </div>
                {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={creatingWorker}>
                {creatingWorker ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Worker"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {loading && !selectedWorker ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No workers found. Click "Add Worker" to create one.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.full_name}</TableCell>
                  <TableCell>{worker.email}</TableCell>
                  <TableCell>{worker.phone_number}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditPermissions(worker)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteWorker(worker.user_id)}
                        disabled={deletingWorkerId === worker.user_id}
                      >
                        {deletingWorkerId === worker.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permissions - {selectedWorker?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-center">View</TableHead>
                  <TableHead className="text-center">Create</TableHead>
                  <TableHead className="text-center">Edit</TableHead>
                  <TableHead className="text-center">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FEATURES.map((feature) => (
                  <TableRow key={feature}>
                    <TableCell className="font-medium">{FEATURE_LABELS[feature] || feature}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permissions[feature]?.can_view || false}
                        onCheckedChange={() => togglePermission(feature, "can_view")}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permissions[feature]?.can_create || false}
                        onCheckedChange={() => togglePermission(feature, "can_create")}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permissions[feature]?.can_edit || false}
                        onCheckedChange={() => togglePermission(feature, "can_edit")}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permissions[feature]?.can_delete || false}
                        onCheckedChange={() => togglePermission(feature, "can_delete")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={handleSavePermissions} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
