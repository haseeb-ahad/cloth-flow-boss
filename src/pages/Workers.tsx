import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users, Trash2, Edit } from "lucide-react";
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

const FEATURES = ["invoice", "inventory", "sales", "credits", "customers"];

export default function Workers() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});

  useEffect(() => {
    if (userRole === "admin") {
      loadWorkers();
    }
  }, [userRole]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "worker");

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
      setSelectedWorker(null);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast.error(error.message || "Failed to save permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm("Are you sure you want to delete this worker?")) return;

    setLoading(true);
    try {
      // Delete will cascade to user_roles and worker_permissions
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", workerId);

      if (error) throw error;

      toast.success("Worker deleted successfully!");
      loadWorkers();
    } catch (error: any) {
      console.error("Error deleting worker:", error);
      toast.error(error.message || "Failed to delete worker");
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Manage Workers</h1>
        </div>
      </div>

      <Card className="p-6">
        {loading && !selectedWorker ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No workers found. Workers will appear here after they sign up.</p>
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditPermissions(worker)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Permissions - {worker.full_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Feature</TableHead>
                                  <TableHead>View</TableHead>
                                  <TableHead>Create</TableHead>
                                  <TableHead>Edit</TableHead>
                                  <TableHead>Delete</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {FEATURES.map((feature) => (
                                  <TableRow key={feature}>
                                    <TableCell className="font-medium capitalize">{feature}</TableCell>
                                    <TableCell>
                                      <Checkbox
                                        checked={permissions[feature]?.can_view || false}
                                        onCheckedChange={(checked) =>
                                          setPermissions({
                                            ...permissions,
                                            [feature]: { ...permissions[feature], can_view: !!checked },
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Checkbox
                                        checked={permissions[feature]?.can_create || false}
                                        onCheckedChange={(checked) =>
                                          setPermissions({
                                            ...permissions,
                                            [feature]: { ...permissions[feature], can_create: !!checked },
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Checkbox
                                        checked={permissions[feature]?.can_edit || false}
                                        onCheckedChange={(checked) =>
                                          setPermissions({
                                            ...permissions,
                                            [feature]: { ...permissions[feature], can_edit: !!checked },
                                          })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Checkbox
                                        checked={permissions[feature]?.can_delete || false}
                                        onCheckedChange={(checked) =>
                                          setPermissions({
                                            ...permissions,
                                            [feature]: { ...permissions[feature], can_delete: !!checked },
                                          })
                                        }
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <Button onClick={handleSavePermissions} disabled={loading}>
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
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteWorker(worker.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
