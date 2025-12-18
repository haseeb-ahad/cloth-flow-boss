import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, CheckCircle2, XCircle, Eye, CreditCard, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface PaymentRequest {
  id: string;
  plan_id: string;
  amount: number;
  proof_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  plan?: {
    name: string;
  };
}

const UserPaymentStatus = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*, plans(name)")
        .eq("admin_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      console.error("Error fetching payment requests:", error);
    }
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  const pendingRequest = requests.find((r) => r.status === "pending");

  return (
    <>
      {pendingRequest && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Payment Under Review</p>
                <p className="text-sm text-amber-700">
                  Your payment for {pendingRequest.plan?.name || "plan"} is being verified. Plan will activate after approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Payment History
          </CardTitle>
          <CardDescription>Your payment submissions and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {request.plan?.name || "Unknown Plan"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Rs {request.amount.toLocaleString()} • {format(new Date(request.created_at), "MMM d, yyyy")}
                    </p>
                    {request.status === "rejected" && request.rejection_reason && (
                      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {request.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(request.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProof(request.proof_url)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proof Preview Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={selectedProof}
                alt="Payment proof"
                className="w-full h-auto max-h-96 object-contain bg-slate-100"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserPaymentStatus;
