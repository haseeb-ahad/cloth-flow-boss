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
import { Plus, DollarSign, Edit, Trash2, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface Product {
  id: string;
  name: string;
  selling_price: number;
  purchase_price: number;
  stock_quantity: number;
  quantity_type: string | null;
}

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  profit: number;
  quantity_type?: string;
}

const Credits = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [groupedCredits, setGroupedCredits] = useState<{ [key: string]: Credit[] }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInvoiceEditDialogOpen, setIsInvoiceEditDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [saleId, setSaleId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [invoicePaidAmount, setInvoicePaidAmount] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [fullPayment, setFullPayment] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    amount: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchCredits();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  };

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
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("credits")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setCredits(data);
      toast.success("Credits data refreshed");
    } catch (error) {
      toast.error("Failed to fetch credits");
    } finally {
      setIsLoading(false);
    }
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
      // Update credit record
      await supabase
        .from("credits")
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        })
        .eq("id", selectedCredit.id);

      // Record payment transaction with auto-filled date
      await supabase
        .from("credit_transactions")
        .insert({
          credit_id: selectedCredit.id,
          customer_name: selectedCredit.customer_name,
          customer_phone: selectedCredit.customer_phone,
          amount: payment,
          transaction_date: new Date().toISOString().split('T')[0],
          notes: fullPayment ? "Full payment received" : "Partial payment received",
        });

      toast.success("Payment recorded successfully!");
      fetchCredits();
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setFullPayment(false);
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleEdit = async (credit: Credit) => {
    const { data: saleData } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("customer_name", credit.customer_name)
      .eq("customer_phone", credit.customer_phone || "")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (saleData) {
      // Open invoice edit dialog with full invoice view
      setSelectedCredit(credit);
      setSaleId(saleData.id);
      setInvoiceNumber(saleData.invoice_number);
      setDiscount(saleData.discount || 0);
      setInvoicePaidAmount(credit.remaining_amount.toString());
      setFormData({
        customer_name: credit.customer_name,
        customer_phone: credit.customer_phone || "",
        amount: credit.amount.toString(),
        due_date: credit.due_date || "",
        notes: credit.notes || "",
      });
      
      const items = saleData.sale_items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price,
        total_price: item.total_price,
        profit: item.profit,
        quantity_type: products.find(p => p.id === item.product_id)?.quantity_type || "Unit"
      }));
      setInvoiceItems(items);
      setIsInvoiceEditDialogOpen(true);
    } else {
      // If no sale found, show simple edit dialog for credit only
      setSelectedCredit(credit);
      setEditPaymentAmount("");
      setFormData({
        customer_name: credit.customer_name,
        customer_phone: credit.customer_phone || "",
        amount: credit.amount.toString(),
        due_date: credit.due_date || "",
        notes: credit.notes || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        id: crypto.randomUUID(),
        product_id: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        purchase_price: 0,
        total_price: 0,
        profit: 0,
        quantity_type: "Unit"
      },
    ]);
  };

  const handleRemoveInvoiceItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter((item) => item.id !== id));
  };

  const handleInvoiceItemChange = (id: string, field: string, value: any) => {
    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          if (field === "product_id") {
            const product = products.find((p) => p.id === value);
            if (product) {
              updatedItem.product_name = product.name;
              updatedItem.unit_price = product.selling_price;
              updatedItem.purchase_price = product.purchase_price;
              updatedItem.quantity_type = product.quantity_type || "Unit";
            }
          }
          
          if (field === "quantity" || field === "unit_price" || field === "purchase_price") {
            updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
            updatedItem.profit = updatedItem.total_price - (updatedItem.quantity * updatedItem.purchase_price);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateInvoiceTotals = () => {
    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);
    const finalAmount = totalAmount - discount;
    return { totalAmount, finalAmount };
  };

  const handleSaveInvoice = async () => {
    if (!selectedCredit || !saleId) return;

    try {
      const { totalAmount, finalAmount } = calculateInvoiceTotals();
      const paidAmt = parseFloat(invoicePaidAmount) || 0;
      const remainingAmt = finalAmount - paidAmt;

      // Update sale
      await supabase
        .from("sales")
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          total_amount: totalAmount,
          discount: discount,
          final_amount: finalAmount,
          paid_amount: paidAmt,
          status: remainingAmt > 0 ? "pending" : "completed",
        })
        .eq("id", saleId);

      // Delete old sale items
      await supabase.from("sale_items").delete().eq("sale_id", saleId);

      // Insert new sale items
      const saleItemsData = invoiceItems.map((item) => ({
        sale_id: saleId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price,
        total_price: item.total_price,
        profit: item.profit,
      }));
      await supabase.from("sale_items").insert(saleItemsData);

      // Update credit
      await supabase
        .from("credits")
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          amount: finalAmount,
          remaining_amount: remainingAmt,
          paid_amount: paidAmt,
          status: remainingAmt > 0 ? "pending" : "paid",
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        })
        .eq("id", selectedCredit.id);

      // Record payment if made
      if (paidAmt > 0) {
        await supabase.from("credit_transactions").insert({
          credit_id: selectedCredit.id,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          amount: paidAmt,
          transaction_date: new Date().toISOString().split('T')[0],
          notes: "Payment via invoice edit",
        });
      }

      toast.success("Invoice and credit updated successfully!");
      fetchCredits();
      setIsInvoiceEditDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to update invoice");
    }
  };

  const handleUpdate = async () => {
    if (!selectedCredit) return;

    try {
      const amount = parseFloat(formData.amount);
      let updates: any = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || null,
        amount: amount,
        remaining_amount: amount - selectedCredit.paid_amount,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
      };

      // Handle payment if provided
      if (editPaymentAmount && parseFloat(editPaymentAmount) > 0) {
        const payment = parseFloat(editPaymentAmount);
        if (payment > selectedCredit.remaining_amount) {
          toast.error("Payment amount cannot be greater than remaining amount");
          return;
        }
        
        const newPaidAmount = selectedCredit.paid_amount + payment;
        const newRemainingAmount = selectedCredit.remaining_amount - payment;
        
        updates.paid_amount = newPaidAmount;
        updates.remaining_amount = newRemainingAmount;
        updates.status = newRemainingAmount === 0 ? "paid" : "pending";

        // Record payment transaction with auto-filled date
        await supabase
          .from("credit_transactions")
          .insert({
            credit_id: selectedCredit.id,
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone || null,
            amount: payment,
            transaction_date: new Date().toISOString().split('T')[0],
            notes: "Payment via edit form",
          });
      }

      await supabase
        .from("credits")
        .update(updates)
        .eq("id", selectedCredit.id);

      toast.success("Credit updated successfully!");
      fetchCredits();
      setIsEditDialogOpen(false);
      setEditPaymentAmount("");
      resetForm();
    } catch (error) {
      toast.error("Failed to update credit");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credit record? This action cannot be undone.")) {
      return;
    }
    
    try {
      await supabase.from("credits").delete().eq("id", id);
      toast.success("Credit deleted successfully!");
      fetchCredits();
    } catch (error) {
      toast.error("Failed to delete credit");
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
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Credit Management</h1>
          <p className="text-muted-foreground mt-1 text-base">Track customer loans and payments</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={fetchCredits} 
            variant="outline" 
            size="icon"
            disabled={isLoading}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Credit
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Add New Credit</DialogTitle>
                <Button 
                  onClick={fetchCredits} 
                  variant="ghost" 
                  size="icon"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCredit && (
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Amount</p>
                    <p className="text-xl font-bold text-primary">Rs. {selectedCredit.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining Amount</p>
                    <p className="text-xl font-bold text-warning">Rs. {selectedCredit.remaining_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="text-lg font-semibold text-success">Rs. {selectedCredit.paid_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold">{getStatusBadge(selectedCredit.status)}</p>
                  </div>
                </div>
              </Card>
            )}
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
              <Label htmlFor="edit_amount">Total Credit Amount</Label>
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
            {selectedCredit && selectedCredit.status === "pending" && (
              <div>
                <Label htmlFor="edit_payment_amount">Add Payment Amount (Optional)</Label>
                <Input
                  id="edit_payment_amount"
                  type="number"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  max={selectedCredit.remaining_amount}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: Rs. {selectedCredit.remaining_amount.toFixed(2)}
                </p>
              </div>
            )}
            <Button onClick={handleUpdate} className="w-full">
              Update Credit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Edit Dialog */}
      <Dialog open={isInvoiceEditDialogOpen} onOpenChange={setIsInvoiceEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice & Credit</DialogTitle>
          </DialogHeader>
          
          {selectedCredit && (
            <div className="space-y-6">
              {/* Credit Summary */}
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Amount</p>
                    <p className="text-xl font-bold text-primary">Rs. {selectedCredit.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining Amount</p>
                    <p className="text-xl font-bold text-warning">Rs. {selectedCredit.remaining_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="text-lg font-semibold text-success">Rs. {selectedCredit.paid_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCredit.status)}</div>
                  </div>
                </div>
              </Card>

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_customer_name">Customer Name</Label>
                  <Input
                    id="invoice_customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_customer_phone">Customer Phone</Label>
                  <Input
                    id="invoice_customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Invoice Items</Label>
                  <Button type="button" onClick={handleAddInvoiceItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {invoiceItems.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                          <Label>Product</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => handleInvoiceItemChange(item.id, "product_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - Rs. {product.selling_price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleInvoiceItemChange(item.id, "quantity", parseFloat(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">{item.quantity_type}</p>
                        </div>
                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleInvoiceItemChange(item.id, "unit_price", parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Total</Label>
                          <Input
                            type="number"
                            value={item.total_price.toFixed(2)}
                            disabled
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveInvoiceItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Totals and Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_discount">Discount</Label>
                  <Input
                    id="invoice_discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_due_date">Due Date</Label>
                  <Input
                    id="invoice_due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <Card className="p-4 bg-primary/5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">Rs. {calculateInvoiceTotals().totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span className="font-semibold">Rs. {discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Final Amount:</span>
                    <span>Rs. {calculateInvoiceTotals().finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <div>
                <Label htmlFor="invoice_paid_amount">Paid Amount</Label>
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  Remaining to pay: Rs. {selectedCredit.remaining_amount.toFixed(2)}
                </div>
                <Input
                  id="invoice_paid_amount"
                  type="number"
                  value={invoicePaidAmount}
                  onChange={(e) => setInvoicePaidAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
              </div>

              <div>
                <Label htmlFor="invoice_notes">Notes</Label>
                <Textarea
                  id="invoice_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button onClick={handleSaveInvoice} className="w-full" size="lg">
                Save Invoice & Update Credit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;
