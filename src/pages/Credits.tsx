import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
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
import { Plus, DollarSign, Edit, Trash2, ChevronDown, ChevronUp, RefreshCw, X, Search, Download, Upload, FileText, ImageIcon, Calendar, CreditCard, Banknote, Wallet, BookOpen } from "lucide-react";
import { exportCreditsToCSV, parseCreditsCSV } from "@/lib/csvExport";
import AnimatedTick from "@/components/AnimatedTick";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreditManagement from "@/components/credits/CreditManagement";
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
  description?: string | null;
  image_url?: string | null;
  credit_type?: string;
  person_type?: string;
  last_payment_date?: string | null;
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
  description?: string | null;
  image_url?: string | null;
}

interface PaymentRecord {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  payment_amount: number;
  payment_date: string;
  description: string | null;
  image_url: string | null;
  notes: string | null;
}

const Credits = () => {
  const { ownerId, hasPermission, userRole } = useAuth();
  const [mainTab, setMainTab] = useState<"invoices" | "management">("invoices");
  const { formatDate, formatDateInput } = useTimezone();
  
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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [creditTypeFilter, setCreditTypeFilter] = useState<string>("all");
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>("");
  const [customerPaymentDateFilters, setCustomerPaymentDateFilters] = useState<{ [key: string]: { start: string; end: string } }>({});
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCashCreditPaymentDialogOpen, setIsCashCreditPaymentDialogOpen] = useState(false);
  const [cashCreditPaymentData, setCashCreditPaymentData] = useState({
    payment_amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: "cash",
    notes: "",
  });
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    amount: "",
    due_date: "",
    notes: "",
  });

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedCredits = parseCreditsCSV(text);
      
      if (parsedCredits.length === 0) {
        toast.error("No valid credits found in CSV");
        return;
      }

      let imported = 0;
      for (const credit of parsedCredits) {
        const { error } = await supabase.from("credits").insert({
          ...credit,
          owner_id: ownerId,
        });
        if (!error) imported++;
      }

      toast.success(`Successfully imported ${imported} credits`);
      fetchCredits();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Initial data fetch and real-time subscription
  useEffect(() => {
    fetchCredits();
    fetchProducts();
    fetchPaymentRecords();

    // Subscribe to real-time changes for instant sync
    const salesChannel = supabase
      .channel('credits-sales-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => fetchCredits()
      )
      .subscribe();

    const creditsChannel = supabase
      .channel('credits-credits-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credits' },
        () => fetchCredits()
      )
      .subscribe();

    const paymentLedgerChannel = supabase
      .channel('credits-payment-ledger-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_ledger' },
        () => fetchPaymentRecords()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(paymentLedgerChannel);
    };
  }, []);

  const fetchPaymentRecords = async () => {
    const { data } = await supabase
      .from("payment_ledger")
      .select("id, customer_name, customer_phone, payment_amount, payment_date, description, image_url, notes")
      .order("payment_date", { ascending: false });
    if (data) setPaymentRecords(data);
  };

  const getCustomerPayments = (customerName: string, customerPhone: string | null) => {
    return paymentRecords.filter(p => 
      p.customer_name === customerName && 
      (p.customer_phone === customerPhone || (!p.customer_phone && !customerPhone))
    );
  };

  useEffect(() => {
    filterCredits();
  }, [credits, searchTerm, creditTypeFilter]);

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
      // Fetch from sales table - only unpaid/partial paid invoices (remaining > 0)
      const { data: salesData } = await supabase
        .from("sales")
        .select("*")
        .not("customer_name", "is", null)
        .neq("payment_status", "paid")
        .order("created_at", { ascending: true }); // Oldest first for FIFO display

      // Fetch from credits table for cash credits - only with remaining > 0
      const { data: cashCreditsData } = await supabase
        .from("credits")
        .select("*")
        .eq("credit_type", "cash")
        .gt("remaining_amount", 0)
        .order("created_at", { ascending: true });

      // Fetch last payment dates from credit_transactions for cash credits
      const { data: transactionsData } = await supabase
        .from("credit_transactions")
        .select("credit_id, transaction_date")
        .order("transaction_date", { ascending: false });

      // Create a map of credit_id to last payment date
      const lastPaymentDates: { [key: string]: string } = {};
      if (transactionsData) {
        transactionsData.forEach(t => {
          if (!lastPaymentDates[t.credit_id]) {
            lastPaymentDates[t.credit_id] = t.transaction_date;
          }
        });
      }

      let allCredits: Credit[] = [];

      if (salesData) {
        // Map sales to credit format - only include those with remaining amount > 0
        const creditsFromSales: Credit[] = salesData
          .filter(sale => (sale.final_amount - (sale.paid_amount || 0)) > 0)
          .map(sale => ({
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
            description: sale.description || null,
            image_url: sale.image_url || null,
            credit_type: "invoice",
            person_type: "customer",
            last_payment_date: null, // Invoice credits don't track this here
          }));
        allCredits = [...allCredits, ...creditsFromSales];
      }

      if (cashCreditsData) {
        // Map cash credits - only those with remaining > 0 (already filtered in query)
        const cashCredits: Credit[] = cashCreditsData.map(credit => ({
          id: credit.id,
          customer_name: credit.customer_name || "",
          customer_phone: credit.customer_phone || null,
          amount: credit.amount,
          paid_amount: credit.paid_amount || 0,
          remaining_amount: credit.remaining_amount,
          due_date: credit.due_date,
          status: credit.status || "pending",
          notes: credit.notes,
          created_at: credit.created_at || "",
          invoice_number: `CASH-${credit.id.slice(0, 8).toUpperCase()}`,
          description: credit.notes,
          image_url: null,
          credit_type: credit.credit_type || "cash",
          person_type: credit.person_type || "other",
          last_payment_date: lastPaymentDates[credit.id] || null,
        }));
        allCredits = [...allCredits, ...cashCredits];
      }

      // Sort by created_at
      allCredits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setCredits(allCredits);
      setFilteredCredits(allCredits);
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

    if (creditTypeFilter !== "all") {
      filtered = filtered.filter(credit => credit.credit_type === creditTypeFilter);
    }

    setFilteredCredits(filtered);
  };

  const getFilteredCustomerPayments = (customerName: string, customerPhone: string | null, customerKey: string) => {
    const allPayments = getCustomerPayments(customerName, customerPhone);
    const dateFilter = customerPaymentDateFilters[customerKey];
    const today = new Date().toISOString().split('T')[0];
    
    // Default to today if no filter set
    const startDate = dateFilter?.start || today;
    const endDate = dateFilter?.end || today;
    
    return allPayments.filter(payment => {
      const paymentDate = payment.payment_date.split('T')[0];
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  };

  const handleCustomerPaymentDateChange = (customerKey: string, field: 'start' | 'end', date: string) => {
    setCustomerPaymentDateFilters(prev => ({
      ...prev,
      [customerKey]: {
        start: field === 'start' ? date : (prev[customerKey]?.start || new Date().toISOString().split('T')[0]),
        end: field === 'end' ? date : (prev[customerKey]?.end || new Date().toISOString().split('T')[0])
      }
    }));
  };

  const clearCustomerPaymentDateFilter = (customerKey: string) => {
    setCustomerPaymentDateFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[customerKey];
      return newFilters;
    });
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

  const openCashCreditPaymentDialog = (credit: Credit) => {
    setSelectedCredit(credit);
    setCashCreditPaymentData({
      payment_amount: "",
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      notes: "",
    });
    setIsCashCreditPaymentDialogOpen(true);
  };

  const handleCashCreditPayment = async () => {
    if (!selectedCredit) return;

    // PERMISSION CHECK
    if (!canEdit) {
      toast.error("You do not have permission to record payments.");
      return;
    }

    const payment = parseFloat(cashCreditPaymentData.payment_amount);
    
    if (!payment || payment <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (payment > selectedCredit.remaining_amount) {
      toast.error("Payment amount cannot exceed remaining balance");
      return;
    }

    const newPaidAmount = selectedCredit.paid_amount + payment;
    const newRemainingAmount = selectedCredit.remaining_amount - payment;
    
    // Determine status based on remaining
    let newStatus = "pending";
    if (newRemainingAmount <= 0) {
      newStatus = "paid";
    } else if (newPaidAmount > 0) {
      newStatus = "partial";
    }

    setIsLoading(true);
    try {
      // Update credit record
      const { error: updateError } = await supabase
        .from("credits")
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        })
        .eq("id", selectedCredit.id);

      if (updateError) throw updateError;

      // Record payment transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          credit_id: selectedCredit.id,
          customer_name: selectedCredit.customer_name,
          customer_phone: selectedCredit.customer_phone,
          amount: payment,
          transaction_date: cashCreditPaymentData.payment_date,
          notes: `${cashCreditPaymentData.payment_mode.toUpperCase()}: ${cashCreditPaymentData.notes || "Payment received"}`,
          owner_id: ownerId,
        });

      if (transactionError) throw transactionError;

      toast.success("Cash credit payment recorded successfully!");
      fetchCredits();
      setIsCashCreditPaymentDialogOpen(false);
      setCashCreditPaymentData({
        payment_amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: "cash",
        notes: "",
      });
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setIsLoading(false);
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
          <AnimatedLogoLoader size="lg" showMessage message="Loading credits..." />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Credits</h1>
          <p className="text-muted-foreground mt-1 text-base">Track customer loans, invoices, and credit management</p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "invoices" | "management")}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="invoices" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Invoice Credits
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Credit Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="mt-6">
          <CreditManagement />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          {/* Existing Invoice Credits Content */}
          <div className="flex items-center justify-end gap-3">
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
            <Label>Credit Type</Label>
            <Select value={creditTypeFilter} onValueChange={setCreditTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoice Credit</SelectItem>
                <SelectItem value="cash">Cash Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => { setSearchTerm(""); setCreditTypeFilter("all"); setCustomerPaymentDateFilters({}); }} 
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Reset
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

            // Check if any credits for this customer are cash or invoice credits
            const hasCashCredit = customerCredits.some(credit => credit.credit_type === "cash");
            const hasInvoiceCredit = customerCredits.some(credit => credit.credit_type === "invoice");
            const hasAnyLabel = hasCashCredit || hasInvoiceCredit;

            return (
              <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleCustomer(key)}>
                <Card className="p-4 bg-muted/30 relative">
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    {hasCashCredit && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-xs font-medium">
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Cash Credit</span>
                      </div>
                    )}
                    {hasInvoiceCredit && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Invoice Credit</span>
                      </div>
                    )}
                  </div>
                  <CollapsibleTrigger className="w-full">
                    <div className={`flex items-center justify-between ${hasAnyLabel ? "mt-6" : ""}`}>
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
                  <CollapsibleContent className="mt-4 space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Payment Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right font-semibold">Remaining</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Notes</TableHead>
                          {canEdit && <TableHead className="text-center">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpaidCredits.map((credit) => (
                          <TableRow key={credit.id}>
                            <TableCell className="font-medium">{credit.invoice_number}</TableCell>
                            <TableCell>
                              <Badge variant={credit.credit_type === "cash" ? "secondary" : "outline"} className="text-xs">
                                {credit.credit_type === "cash" ? "Cash" : "Invoice"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(credit.created_at)}</TableCell>
                            <TableCell>
                              {credit.last_payment_date ? formatDate(credit.last_payment_date) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
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
                            <TableCell className="text-center">
                              {(credit.description || credit.image_url) ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button className="cursor-pointer hover:opacity-80 p-1 rounded hover:bg-muted">
                                      <FileText className="h-4 w-4 text-primary" />
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Invoice notes</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {credit.description && (
                                        <div>
                                          <Label className="text-sm font-medium">Description</Label>
                                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                            {credit.description}
                                          </p>
                                        </div>
                                      )}
                                      {credit.image_url && (
                                        <div>
                                          <Label className="text-sm font-medium">Attached image</Label>
                                          <img 
                                            src={credit.image_url} 
                                            alt="Invoice attachment" 
                                            className="mt-2 w-full h-auto rounded-lg border"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-center">
                                {credit.credit_type === "cash" && credit.remaining_amount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openCashCreditPaymentDialog(credit)}
                                    className="gap-1"
                                  >
                                    <Wallet className="h-3.5 w-3.5" />
                                    Receive
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Payment History from Receive Payment */}
                    {(() => {
                      const allCustomerPayments = getCustomerPayments(firstCredit.customer_name, firstCredit.customer_phone);
                      if (allCustomerPayments.length === 0) return null;
                      
                      const filteredPayments = getFilteredCustomerPayments(firstCredit.customer_name, firstCredit.customer_phone, key);
                      const today = new Date().toISOString().split('T')[0];
                      const currentStartDate = customerPaymentDateFilters[key]?.start || today;
                      const currentEndDate = customerPaymentDateFilters[key]?.end || today;
                      
                      return (
                        <div className="mt-4 border-t pt-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Payment History
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Label className="text-xs">From:</Label>
                                <Input
                                  type="date"
                                  value={currentStartDate}
                                  onChange={(e) => handleCustomerPaymentDateChange(key, 'start', e.target.value)}
                                  className="w-36 h-8 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <Label className="text-xs">To:</Label>
                                <Input
                                  type="date"
                                  value={currentEndDate}
                                  onChange={(e) => handleCustomerPaymentDateChange(key, 'end', e.target.value)}
                                  className="w-36 h-8 text-sm"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearCustomerPaymentDateFilter(key)}
                                className="h-8 px-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {filteredPayments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No payments found for selected date range</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-center">Image</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredPayments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell className="whitespace-nowrap">
                                      {formatDate(payment.payment_date)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-success whitespace-nowrap">
                                      Rs. {payment.payment_amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                      {payment.description || payment.notes || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {payment.image_url ? (
                                        <button
                                          onClick={() => setSelectedImage(payment.image_url)}
                                          className="inline-block"
                                        >
                                          <img 
                                            src={payment.image_url} 
                                            alt="Payment proof" 
                                            className="h-10 w-10 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer mx-auto"
                                          />
                                        </button>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      );
                    })()}
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

      {/* Cash Credit Payment Dialog */}
      <Dialog open={isCashCreditPaymentDialogOpen} onOpenChange={setIsCashCreditPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Receive Payment - Cash Credit
            </DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-5">
              {/* Credit Summary */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Person</span>
                    <span className="font-semibold">{selectedCredit.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {selectedCredit.person_type || "Other"}
                    </Badge>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-sm">Rs. {selectedCredit.amount.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold text-sm text-success">Rs. {selectedCredit.paid_amount.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="font-bold text-sm text-warning">Rs. {selectedCredit.remaining_amount.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cash_payment_amount">Payment Amount *</Label>
                  <Input
                    id="cash_payment_amount"
                    type="number"
                    value={cashCreditPaymentData.payment_amount}
                    onChange={(e) => setCashCreditPaymentData({ ...cashCreditPaymentData, payment_amount: e.target.value })}
                    placeholder="Enter amount"
                    max={selectedCredit.remaining_amount}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: Rs. {selectedCredit.remaining_amount.toFixed(0)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="cash_payment_date">Payment Date</Label>
                  <Input
                    id="cash_payment_date"
                    type="date"
                    value={cashCreditPaymentData.payment_date}
                    onChange={(e) => setCashCreditPaymentData({ ...cashCreditPaymentData, payment_date: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Payment Mode</Label>
                  <Select 
                    value={cashCreditPaymentData.payment_mode} 
                    onValueChange={(value) => setCashCreditPaymentData({ ...cashCreditPaymentData, payment_mode: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="bank">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Bank Transfer
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Other
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cash_payment_notes">Note (Optional)</Label>
                  <Textarea
                    id="cash_payment_notes"
                    value={cashCreditPaymentData.notes}
                    onChange={(e) => setCashCreditPaymentData({ ...cashCreditPaymentData, notes: e.target.value })}
                    placeholder="Add a reference or note..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleCashCreditPayment} 
                  className="flex-1"
                  disabled={isLoading || !cashCreditPaymentData.payment_amount}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  Record Payment
                </Button>
                <Button 
                  onClick={() => setIsCashCreditPaymentDialogOpen(false)} 
                  variant="outline"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Payment proof" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Credits;
