import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface PaymentRequest {
  id: string;
  admin_id: string;
  plan_id: string;
  amount: number;
  proof_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  verified_at: string | null;
  profile?: {
    email: string;
    full_name: string | null;
  };
  plan?: {
    name: string;
    duration_months: number;
  };
}

const SuperAdminPaymentRequests = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [proofDialog, setProofDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_payment_requests" },
      });

      if (error) throw error;
      setRequests(data?.requests || []);
    } catch (error) {
      console.error("Error fetching payment requests:", error);
      toast.error("Failed to load payment requests");
    }
    setIsLoading(false);
  };

  const handleApprove = async (request: PaymentRequest) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("super-admin", {
        body: {
          action: "approve_payment_request",
          data: { request_id: request.id },
        },
      });

      if (error) throw error;
      toast.success("Payment approved! User's plan is now active.");
      fetchRequests();
    } catch (error: any) {
      console.error("Error approving payment:", error);
      toast.error(error.message || "Failed to approve payment");
    }
    setIsProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("super-admin", {
        body: {
          action: "reject_payment_request",
          data: { 
            request_id: selectedRequest.id,
            rejection_reason: rejectionReason || "Payment not verified"
          },
        },
      });

      if (error) throw error;
      toast.success("Payment rejected");
      setRejectDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting payment:", error);
      toast.error(error.message || "Failed to reject payment");
    }
    setIsProcessing(false);
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {pendingCount > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  {pendingCount} Pending Payment{pendingCount > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-amber-700">
                  Review and approve or reject payment requests
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Payment Requests</CardTitle>
              <CardDescription>Review and verify user payment submissions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>No payment requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.profile?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {request.profile?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{request.plan?.name || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        Rs {request.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setProofDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {format(new Date(request.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={isProcessing}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectDialog(true);
                              }}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.status === "rejected" && request.rejection_reason && (
                          <span className="text-sm text-red-500">
                            {request.rejection_reason}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proof Dialog */}
      <Dialog open={proofDialog} onOpenChange={setProofDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Review the payment screenshot submitted by the user
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-sm text-slate-500">User</p>
                <p className="font-medium">{selectedRequest.profile?.full_name}</p>
                <p className="text-sm text-slate-500">{selectedRequest.profile?.email}</p>
              </div>
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={selectedRequest.proof_url}
                  alt="Payment proof"
                  className="w-full h-auto max-h-96 object-contain bg-slate-100"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofDialog(false)}>
              Close
            </Button>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  onClick={() => {
                    setProofDialog(false);
                    handleApprove(selectedRequest);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payment (optional)
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reject Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminPaymentRequests;
