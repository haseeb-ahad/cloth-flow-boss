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
import { Plus, DollarSign, Edit, Trash2, Calendar, RefreshCw, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Installment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_amount: number;
  frequency: string;
  next_due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface InstallmentPayment {
  id: string;
  installment_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
}

const Installments = () => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    total_amount: "",
    installment_amount: "",
    frequency: "monthly",
    first_due_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchInstallments();
  }, []);

  const fetchInstallments = async () => {
    const { data } = await supabase
      .from("installments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setInstallments(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirm("Are you sure you want to create this installment plan?")) return;

    const totalAmount = parseFloat(formData.total_amount);
    const installmentAmount = parseFloat(formData.installment_amount);

    const installmentData = {
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone || null,
      total_amount: totalAmount,
      paid_amount: 0,
      remaining_amount: totalAmount,
      installment_amount: installmentAmount,
      frequency: formData.frequency,
      next_due_date: formData.first_due_date || null,
      status: "active",
      notes: formData.notes || null,
    };

    try {
      await supabase.from("installments").insert(installmentData);
      toast.success("Installment plan created successfully!");
      fetchInstallments();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create installment plan");
    }
  };

  const handlePayment = async () => {
    if (!selectedInstallment) return;

    const payment = parseFloat(paymentAmount);
    
    if (payment <= 0 || payment > selectedInstallment.remaining_amount) {
      toast.error("Invalid payment amount");
      return;
    }

    if (!confirm(`Record payment of Rs. ${payment.toFixed(2)} for ${selectedInstallment.customer_name}?`)) return;

    const newPaidAmount = selectedInstallment.paid_amount + payment;
    const newRemainingAmount = selectedInstallment.remaining_amount - payment;
    const newStatus = newRemainingAmount === 0 ? "completed" : "active";

    try {
      // Update installment record
      await supabase
        .from("installments")
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        })
        .eq("id", selectedInstallment.id);

      // Record payment transaction
      await supabase
        .from("installment_payments")
        .insert({
          installment_id: selectedInstallment.id,
          amount: payment,
          payment_date: new Date().toISOString().split('T')[0],
          notes: "Installment payment received",
        });

      toast.success("Payment recorded successfully!");
      fetchInstallments();
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this installment plan? This action cannot be undone.")) {
      return;
    }

    try {
      await supabase.from("installments").delete().eq("id", id);
      toast.success("Installment plan deleted successfully!");
      fetchInstallments();
    } catch (error) {
      toast.error("Failed to delete installment plan");
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      total_amount: "",
      installment_amount: "",
      frequency: "monthly",
      first_due_date: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return <Badge className="bg-success text-success-foreground">Completed</Badge>;
    }
    if (status === "active") {
      return <Badge className="bg-primary text-primary-foreground">Active</Badge>;
    }
    return <Badge className="bg-warning text-warning-foreground">Overdue</Badge>;
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors: { [key: string]: string } = {
      daily: "bg-accent text-accent-foreground",
      weekly: "bg-secondary text-secondary-foreground",
      monthly: "bg-primary text-primary-foreground",
    };
    return (
      <Badge className={colors[frequency] || ""}>
        {frequency.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Installment Plans</h1>
          <p className="text-muted-foreground">Manage customer payment plans and schedules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchInstallments} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Installment Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Installment Plan</DialogTitle>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="total_amount">Total Amount *</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      required
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="installment_amount">Installment Amount *</Label>
                    <Input
                      id="installment_amount"
                      type="number"
                      required
                      value={formData.installment_amount}
                      onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="frequency">Frequency *</Label>
                    <select
                      id="frequency"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="first_due_date">First Due Date</Label>
                    <Input
                      id="first_due_date"
                      type="date"
                      value={formData.first_due_date}
                      onChange={(e) => setFormData({ ...formData, first_due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Create Installment Plan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Installment</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((installment) => (
              <TableRow key={installment.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{installment.customer_name}</div>
                    {installment.customer_phone && (
                      <div className="text-sm text-muted-foreground">{installment.customer_phone}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">Rs. {installment.total_amount.toFixed(2)}</TableCell>
                <TableCell className="text-right text-success">Rs. {installment.paid_amount.toFixed(2)}</TableCell>
                <TableCell className="text-right text-warning font-semibold">
                  Rs. {installment.remaining_amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">Rs. {installment.installment_amount.toFixed(2)}</TableCell>
                <TableCell>{getFrequencyBadge(installment.frequency)}</TableCell>
                <TableCell>
                  {installment.next_due_date ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(installment.next_due_date), "dd MMM yyyy")}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(installment.status)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-2 justify-center">
                    {installment.status === "active" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedInstallment(installment);
                          setPaymentAmount(installment.installment_amount.toString());
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Pay
                      </Button>
                    )}
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(installment.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Installment Payment</DialogTitle>
          </DialogHeader>
          {selectedInstallment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{selectedInstallment.customer_name}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">Rs. {selectedInstallment.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-lg font-bold text-warning">Rs. {selectedInstallment.remaining_amount.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regular Installment Amount</p>
                <p className="text-lg font-semibold text-primary">Rs. {selectedInstallment.installment_amount.toFixed(2)}</p>
              </div>
              <div>
                <Label htmlFor="paymentAmount">Payment Amount *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
              </div>
              <Button onClick={handlePayment} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Installments;
