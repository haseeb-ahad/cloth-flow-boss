import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, DollarSign, Edit, Trash2, ChevronDown, ChevronUp, RefreshCw, X, Search, Download } from "lucide-react";
import { exportCreditsToCSV } from "@/lib/csvExport";
import AnimatedTick from "@/components/AnimatedTick";
import { formatDatePKT } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Credit now represents a sale/invoice with remaining balance
interface Credit {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  amount: number; // final_amount from sales
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: string; // payment_status from sales
  notes: string | null;
  created_at: string;
  invoice_number: string;
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

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  paid_amount: number;
  payment_method: string;
  created_at: string;
  status: string;
  payment_status?: string;
}

const Credits = () => {
  const { ownerId, hasPermission, userRole } = useAuth();
  
  // Permission checks
  const canCreate = userRole === "admin" || hasPermission("credits", "create");
  const canEdit = userRole === "admin" || hasPermission("credits", "edit");
  const canDelete = userRole === "admin" || hasPermission("credits", "delete");
  const [credits, setCredits] = useState<Credit[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<Credit[]>([]);
  const [groupedCredits, setGroupedCredits] = useState<{ [key: string]: Credit[] }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>("");
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

  useEffect(() => {
    filterCredits();
  }, [credits, searchTerm, dateFilter]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  };

  useEffect(() => {
    // Group credits by customer
    const grouped: { [key: string]: Credit[] } = {};
    filteredCredits.forEach(credit => {
      const key = `${credit.customer_name}-${credit.customer_phone || 'no-phone'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(credit);
    });
    setGroupedCredits(grouped);
  }, [filteredCredits]);

  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      // Fetch from sales table - this is the source of truth updated by Receive Payment
      const { data: salesData } = await supabase
        .from("sales")
        .select("*")
        .not("customer_name", "is", null)
        .order("created_at", { ascending: true }); // Oldest first for FIFO display

      if (salesData) {
        // Map sales to credit format - only read values, no recalculation
        const creditsFromSales: Credit[] = salesData.map(sale => ({
          id: sale.id,
          customer_name: sale.customer_name || "",
          customer_phone: sale.customer_phone || null,
          amount: sale.final_amount, // Total invoice amount
          paid_amount: sale.paid_amount || 0, // Exact value from sales table
          remaining_amount: sale.final_amount - (sale.paid_amount || 0), // Calculated from sales table values
          due_date: null,
          status: sale.payment_status || "pending", // Exact status from sales table
          notes: null,
          created_at: sale.created_at || "",
          invoice_number: sale.invoice_number,
        }));

        setCredits(creditsFromSales);
        setFilteredCredits(creditsFromSales);
      }
      toast.success("Credits data refreshed");
    } catch (error) {
      toast.error("Failed to fetch credits");
    } finally {
      setIsLoading(false);
    }
  };

  const filterCredits = () => {
    let filtered = [...credits];

    if (searchTerm) {
      filtered = filtered.filter(credit => 
        (credit.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (credit.customer_phone?.includes(searchTerm))
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(credit => 
        credit.created_at?.startsWith(dateFilter) ||
        credit.due_date?.startsWith(dateFilter)
      );
    }

    setFilteredCredits(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // PERMISSION CHECK
    if (!canCreate) {
      toast.error("You do not have permission to create credits.");
      return;
    }

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

      // Update associated sale record
      const { data: saleData } = await supabase
        .from("sales")
        .select("id, final_amount")
        .eq("customer_name", selectedCredit.customer_name)
        .eq("customer_phone", selectedCredit.customer_phone || "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (saleData) {
        await supabase
          .from("sales")
          .update({
            paid_amount: newPaidAmount,
            status: newStatus === "paid" ? "completed" : "pending",
            payment_status: newStatus === "paid" ? "paid" : "pending",
          })
          .eq("id", saleData.id);
      }

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
          owner_id: ownerId,
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
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("customer_name", credit.customer_name)
      .eq("customer_phone", credit.customer_phone || "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (saleError) {
      console.error("Error loading sale data:", saleError);
      toast.error("Failed to load associated sale data");
    }

    // Always open invoice edit dialog
    setSelectedCredit(credit);
    setInvoicePaidAmount(credit.remaining_amount.toString());
    setFormData({
      customer_name: credit.customer_name,
      customer_phone: credit.customer_phone || "",
      amount: credit.amount.toString(),
      due_date: credit.due_date || "",
      notes: credit.notes || "",
    });
    
    if (saleData) {
      // CRITICAL: Check if sale has items
      if (!saleData.sale_items || saleData.sale_items.length === 0) {
        toast.error("WARNING: This sale has no items! Cannot edit safely.");
        console.error("Sale has no items:", saleData.invoice_number);
        return;
      }

      setSaleId(saleData.id);
      setInvoiceNumber(saleData.invoice_number);
      setDiscount(saleData.discount || 0);
      setCurrentPaymentStatus(saleData.payment_status || "");
      
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
      console.log(`Credits Edit: Loaded ${items.length} items for editing`);
      setInvoiceItems(items);
    } else {
      // No sale found, initialize empty invoice
      setSaleId("");
      setInvoiceNumber("");
      setDiscount(0);
      setInvoiceItems([]);
    }
    
    setIsInvoiceEditDialogOpen(true);
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
    // CRITICAL PROTECTION: Prevent removing last item when editing a sale
    if (saleId && invoiceItems.length === 1) {
      toast.error("Cannot remove the last item! An invoice must have at least one product.");
      return;
    }
    
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
    if (!selectedCredit) return;
    
    // PERMISSION CHECK
    if (!canEdit) {
      toast.error("You do not have permission to edit credits.");
      return;
    }

    // CRITICAL VALIDATION: Ensure invoice items exist when editing a sale
    if (saleId && invoiceItems.length === 0) {
      toast.error("Cannot save invoice without items! Please add at least one product.");
      return;
    }

    try {
      const paidAmt = parseFloat(invoicePaidAmount) || 0;
      
      if (saleId && invoiceItems.length > 0) {
        // Case 1: There's a sale - update sale and credit with proper inventory management
        const { totalAmount, finalAmount } = calculateInvoiceTotals();
        const remainingAmt = finalAmount - paidAmt;

        // TASK 3: Get original items to restore their stock first
        const { data: originalItems, error: fetchOriginalError } = await supabase
          .from("sale_items")
          .select("*")
          .eq("sale_id", saleId);

        if (fetchOriginalError) {
          console.error("Error fetching original items:", fetchOriginalError);
          toast.error("Failed to load original items");
          throw fetchOriginalError;
        }

        // Restore stock for all original items
        console.log("Credits Edit: Restoring stock for original items:", originalItems);
        for (const originalItem of originalItems || []) {
          const { data: product, error: fetchError } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", originalItem.product_id)
            .single();

          if (fetchError || !product) {
            console.error("Error fetching product for restoration:", fetchError);
            toast.error(`Failed to restore stock for ${originalItem.product_name}`);
            throw fetchError || new Error("Product not found");
          }

          const restoredStock = product.stock_quantity + originalItem.quantity;
          console.log(`Restoring ${originalItem.product_name}: ${product.stock_quantity} + ${originalItem.quantity} = ${restoredStock}`);

          const { error: updateError } = await supabase
            .from("products")
            .update({ stock_quantity: restoredStock })
            .eq("id", originalItem.product_id);
          
          if (updateError) {
            console.error("Error restoring stock:", updateError);
            toast.error(`Failed to restore stock for ${originalItem.product_name}`);
            throw updateError;
          }
        }

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
            payment_status: remainingAmt > 0 ? "pending" : "paid",
          })
          .eq("id", saleId);

        // Delete old sale items
        console.log(`Credits Edit: Deleting old items and replacing with ${invoiceItems.length} new items`);
        await supabase.from("sale_items").delete().eq("sale_id", saleId);

        // Insert new sale items with error handling and inventory deduction
        console.log(`Credits Edit: Inserting ${invoiceItems.length} new items`);
        for (let i = 0; i < invoiceItems.length; i++) {
          const item = invoiceItems[i];
          
          // Insert the item
          const { error: insertError } = await supabase.from("sale_items").insert({
            sale_id: saleId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            purchase_price: item.purchase_price,
            total_price: item.total_price,
            profit: item.profit,
          });

          if (insertError) {
            console.error(`Error inserting item ${i + 1}/${invoiceItems.length}:`, insertError);
            toast.error(`Failed to add ${item.product_name}`);
            throw insertError;
          }

          console.log(`✓ Item ${i + 1}/${invoiceItems.length} inserted: ${item.product_name}`);

          // Deduct stock from inventory
          const { data: product, error: fetchError } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (fetchError || !product) {
            console.error("Error fetching product:", fetchError);
            toast.error(`Failed to update inventory for ${item.product_name}`);
            throw fetchError || new Error("Product not found");
          }

          const newStock = product.stock_quantity - item.quantity;

          if (newStock < 0) {
            toast.error(`Insufficient stock for ${item.product_name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
            throw new Error("Insufficient stock");
          }

          console.log(`Deducting ${item.product_name}: ${product.stock_quantity} - ${item.quantity} = ${newStock}`);

          const { error: updateError } = await supabase
            .from("products")
            .update({ stock_quantity: newStock })
            .eq("id", item.product_id);

          if (updateError) {
            console.error("Error updating inventory:", updateError);
            toast.error(`Failed to update inventory for ${item.product_name}`);
            throw updateError;
          }

          console.log(`✓ Inventory updated for ${item.product_name}`);
        }

        console.log("✓ Credits Edit: All items saved and inventory updated successfully");

        // Update credit with new invoice totals
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
      } else {
        // Case 2: No sale - just update credit payment
        const currentPaid = selectedCredit.paid_amount + paidAmt;
        const newRemainingAmt = selectedCredit.amount - currentPaid;

        await supabase
          .from("credits")
          .update({
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone || null,
            paid_amount: currentPaid,
            remaining_amount: newRemainingAmt,
            status: newRemainingAmt <= 0 ? "paid" : "pending",
            due_date: formData.due_date || null,
            notes: formData.notes || null,
          })
          .eq("id", selectedCredit.id);
      }

      // Record payment transaction if payment made
      if (paidAmt > 0) {
        await supabase.from("credit_transactions").insert({
          credit_id: selectedCredit.id,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          amount: paidAmt,
          transaction_date: new Date().toISOString().split('T')[0],
          notes: saleId ? "Payment via invoice edit" : "Direct payment",
        });
      }

      toast.success("Credit updated successfully!");
      fetchCredits();
      setIsInvoiceEditDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to update credit");
      console.error(error);
    }
  };


  const handleDelete = async (id: string) => {
    // PERMISSION CHECK
    if (!canDelete) {
      toast.error("You do not have permission to delete credits.");
      return;
    }
    
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

  const getStatusBadge = (credit: Credit) => {
    // Determine status based on remaining_amount - same logic as Receive Payment
    if (credit.remaining_amount <= 0) {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    } else if (credit.paid_amount > 0 && credit.remaining_amount > 0) {
      return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
    }
    return <Badge className="bg-destructive text-destructive-foreground">Unpaid</Badge>;
  };

  const getCustomerTotal = (customerCredits: Credit[]) => {
    // Sum remaining_amount directly from sales table data - no recalculation
    return customerCredits.reduce((sum, credit) => sum + credit.remaining_amount, 0);
  };

  // Filter to show only unpaid invoices (remaining_amount > 0)
  const getUnpaidCredits = (customerCredits: Credit[]) => {
    return customerCredits.filter(credit => credit.remaining_amount > 0);
  };

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground text-lg">Loading credits...</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Credit Management</h1>
          <p className="text-muted-foreground mt-1 text-base">Track customer loans and payments</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => exportCreditsToCSV(filteredCredits)} 
            variant="outline"
            disabled={isLoading || filteredCredits.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={fetchCredits} 
            variant="outline" 
            size="icon"
            disabled={isLoading}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                  <Button disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add credit
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Add new credit</DialogTitle>
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
                <Label htmlFor="customer_name">Customer name *</Label>
                <Input
                  id="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">Customer phone</Label>
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
                <Label htmlFor="due_date">Due date</Label>
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
              <Button type="submit" className="w-full">Add credit</Button>
            </form>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <Label>Search by Name or Phone</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label>Filter by Date</Label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => { setSearchTerm(""); setDateFilter(""); }} 
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          {Object.entries(groupedCredits).map(([key, customerCredits]) => {
            const firstCredit = customerCredits[0];
            const unpaidCredits = getUnpaidCredits(customerCredits);
            const totalRemaining = getCustomerTotal(customerCredits);
            const isExpanded = expandedCustomers.has(key);

            // Skip customers with no remaining balance
            if (totalRemaining <= 0) return null;

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
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Remaining</p>
                          <p className="text-2xl font-bold text-warning">Rs. {totalRemaining.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{unpaidCredits.length} unpaid invoice(s)</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right font-semibold">Remaining</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpaidCredits.map((credit) => (
                          <TableRow key={credit.id}>
                            <TableCell className="font-medium">{credit.invoice_number}</TableCell>
                            <TableCell>{formatDatePKT(credit.created_at)}</TableCell>
                            <TableCell className="text-right">
                              Rs. {credit.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              Rs. {credit.paid_amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-warning font-semibold">
                              Rs. {credit.remaining_amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{getStatusBadge(credit)}</TableCell>
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
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{selectedCredit.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining amount</p>
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
                  <Label htmlFor="paymentAmount">Payment amount</Label>
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
                  Record payment
                </Button>
                <Button onClick={() => setIsPaymentDialogOpen(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Edit Dialog */}
      <Dialog open={isInvoiceEditDialogOpen} onOpenChange={setIsInvoiceEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit credit</DialogTitle>
          </DialogHeader>
          
          {selectedCredit && (
            <div className="space-y-6">
              {/* Credit Summary */}
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Original amount</p>
                    <p className="text-xl font-bold text-primary">Rs. {selectedCredit.amount.toFixed(2)}</p>
                  </div>
                  <div>
                <p className="text-sm text-muted-foreground">Remaining amount</p>
                    <p className="text-xl font-bold text-warning">Rs. {selectedCredit.remaining_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid amount</p>
                    <p className="text-lg font-semibold text-success">Rs. {selectedCredit.paid_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCredit)}</div>
                  </div>
                </div>
              </Card>

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_customer_name">Customer name</Label>
                  <Input
                    id="invoice_customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_customer_phone">Customer phone</Label>
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
                  <Label className="text-base font-semibold">Invoice items</Label>
                  <Button type="button" onClick={handleAddInvoiceItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add item
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
                          <Label>Unit price</Label>
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
                  <Label htmlFor="invoice_due_date">Due date</Label>
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
                    <span>Final amount:</span>
                    <span>Rs. {calculateInvoiceTotals().finalAmount.toFixed(2)}</span>
                  </div>
                  {currentPaymentStatus === "paid" && (
                    <div className="flex justify-center py-2 border-t">
                      <AnimatedTick />
                    </div>
                  )}
                </div>
              </Card>

              <div>
                <Label htmlFor="invoice_paid_amount">Paid amount</Label>
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
                Save invoice & update credit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;
