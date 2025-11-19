import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Credit {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const Credits = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    amount: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    const { data } = await supabase
      .from("credits")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCredits(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    const creditData = {
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone || null,
      amount: amount,
      paid_amount: 0,
      remaining_amount: amount,
      due_date: formData.due_date || null,
      status: "pending",
      notes: formData.notes || null,
    };

    try {
      await supabase.from("credits").insert(creditData);
      toast.success("Credit record added successfully!");
      fetchCredits();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to add credit record");
    }
  };

  const handlePayment = async () => {
    if (!selectedCredit) return;

    const payment = parseFloat(paymentAmount);
    if (payment <= 0 || payment > selectedCredit.remaining_amount) {
      toast.error("Invalid payment amount");
      return;
    }

    const newPaidAmount = selectedCredit.paid_amount + payment;
    const newRemainingAmount = selectedCredit.remaining_amount - payment;
    const newStatus = newRemainingAmount === 0 ? "paid" : "pending";

    try {
      await supabase
        .from("credits")
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        })
        .eq("id", selectedCredit.id);

      toast.success("Payment recorded successfully!");
      fetchCredits();
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      amount: "",
      due_date: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    }
    return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Credit Management</h1>
          <p className="text-muted-foreground">Track loans and pending payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Credit Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (PKR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Add Credit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credits.map((credit) => (
              <TableRow key={credit.id}>
                <TableCell className="font-medium">{credit.customer_name}</TableCell>
                <TableCell>{credit.customer_phone || "-"}</TableCell>
                <TableCell className="text-right">Rs. {credit.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right text-success">
                  Rs. {credit.paid_amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-semibold text-warning">
                  Rs. {credit.remaining_amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {credit.due_date ? format(new Date(credit.due_date), "dd MMM yyyy") : "-"}
                </TableCell>
                <TableCell className="text-center">{getStatusBadge(credit.status)}</TableCell>
                <TableCell className="text-right">
                  {credit.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCredit(credit);
                        setIsPaymentDialogOpen(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="text-lg font-semibold">{selectedCredit.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining Amount</p>
                <p className="text-2xl font-bold text-warning">
                  Rs. {selectedCredit.remaining_amount.toFixed(2)}
                </p>
              </div>
              <div>
                <Label htmlFor="payment">Payment Amount (PKR)</Label>
                <Input
                  id="payment"
                  type="number"
                  step="0.01"
                  max={selectedCredit.remaining_amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
              </div>
              <div className="flex gap-4">
                <Button onClick={handlePayment} className="flex-1">
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setPaymentAmount("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;
