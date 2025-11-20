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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, DollarSign, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [groupedCredits, setGroupedCredits] = useState<{ [key: string]: Credit[] }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [fullPayment, setFullPayment] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    // Group credits by customer
    const grouped: { [key: string]: Credit[] } = {};
    credits.forEach(credit => {
      const key = `${credit.customer_name}-${credit.customer_phone || 'no-phone'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(credit);
    });
    setGroupedCredits(grouped);
  }, [credits]);

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

    const payment = fullPayment ? selectedCredit.remaining_amount : parseFloat(paymentAmount);
    
    if (!fullPayment && (payment <= 0 || payment > selectedCredit.remaining_amount)) {
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
      setFullPayment(false);
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleEdit = (credit: Credit) => {
    setSelectedCredit(credit);
    setFormData({
      customer_name: credit.customer_name,
      customer_phone: credit.customer_phone || "",
      amount: credit.amount.toString(),
      due_date: credit.due_date || "",
      notes: credit.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCredit) return;

    try {
      const amount = parseFloat(formData.amount);
      await supabase
        .from("credits")
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          amount: amount,
          remaining_amount: amount - selectedCredit.paid_amount,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        })
        .eq("id", selectedCredit.id);

      toast.success("Credit updated successfully!");
      fetchCredits();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to update credit");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this credit record?")) {
      try {
        await supabase.from("credits").delete().eq("id", id);
        toast.success("Credit deleted successfully!");
        fetchCredits();
      } catch (error) {
        toast.error("Failed to delete credit");
      }
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
    setSelectedCredit(null);
  };

  const toggleCustomer = (key: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCustomers(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    }
    return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
  };

  const getCustomerTotal = (customerCredits: Credit[]) => {
    return customerCredits.reduce((sum, credit) => sum + credit.remaining_amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Credit Management</h1>
          <p className="text-muted-foreground">Track customer loans and payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Credit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Credit</DialogTitle>
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
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
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
              <Button type="submit" className="w-full">Add Credit</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {Object.entries(groupedCredits).map(([key, customerCredits]) => {
            const firstCredit = customerCredits[0];
            const totalRemaining = getCustomerTotal(customerCredits);
            const isExpanded = expandedCustomers.has(key);

            return (
              <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleCustomer(key)}>
                <Card className="p-4 bg-muted/30">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">{firstCredit.customer_name}</h3>
                          {firstCredit.customer_phone && (
                            <p className="text-sm text-muted-foreground">{firstCredit.customer_phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Remaining</p>
                        <p className="text-xl font-bold text-warning">Rs. {totalRemaining.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{customerCredits.length} transaction(s)</p>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerCredits.map((credit) => (
                          <TableRow key={credit.id}>
                            <TableCell>{format(new Date(credit.created_at), "dd MMM yyyy")}</TableCell>
                            <TableCell className="text-right">Rs. {credit.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-success">Rs. {credit.paid_amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-warning font-semibold">
                              Rs. {credit.remaining_amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{getStatusBadge(credit.status)}</TableCell>
                            <TableCell>
                              {credit.due_date ? format(new Date(credit.due_date), "dd MMM yyyy") : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-2 justify-center">
                                {credit.status === "pending" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCredit(credit);
                                      setIsPaymentDialogOpen(true);
                                    }}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Pay
                                  </Button>
                                )}
                                <Button size="icon" variant="outline" onClick={() => handleEdit(credit)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="destructive" onClick={() => handleDelete(credit.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
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
                <p className="font-semibold">{selectedCredit.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining Amount</p>
                <p className="text-2xl font-bold text-warning">Rs. {selectedCredit.remaining_amount.toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fullPayment"
                  checked={fullPayment}
                  onCheckedChange={(checked) => setFullPayment(checked as boolean)}
                />
                <Label htmlFor="fullPayment" className="font-medium cursor-pointer">
                  Pay full amount
                </Label>
              </div>
              {!fullPayment && (
                <div>
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={selectedCredit.remaining_amount}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handlePayment} className="flex-1">
                  Record Payment
                </Button>
                <Button onClick={() => setIsPaymentDialogOpen(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_customer_name">Customer Name</Label>
              <Input
                id="edit_customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_customer_phone">Customer Phone</Label>
              <Input
                id="edit_customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_amount">Amount</Label>
              <Input
                id="edit_amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_due_date">Due Date</Label>
              <Input
                id="edit_due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Update Credit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;
