import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineCredits, Credit as OfflineCredit, CreditTransaction } from "@/hooks/useOfflineCredits";
import { useOfflineProducts } from "@/hooks/useOfflineProducts";
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
import { Plus, DollarSign, Edit, Trash2, ChevronDown, ChevronUp, RefreshCw, X, Search, Download, Upload, FileText, ImageIcon, Calendar, CreditCard, Banknote, Wallet } from "lucide-react";
import { exportCreditsToCSV, parseCreditsCSV } from "@/lib/csvExport";
import AnimatedTick from "@/components/AnimatedTick";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import * as offlineDb from "@/lib/offlineDb";

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
  const { formatDate, formatDateInput } = useTimezone();
  const { isOnline } = useOffline();
  const { credits: offlineCreditsData, refetch: refetchOfflineCredits, addCredit: addOfflineCredit, updateCredit: updateOfflineCredit, recordPayment: recordOfflinePayment } = useOfflineCredits();
  const { products: offlineProducts, updateProduct: updateOfflineProduct } = useOfflineProducts();
  
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
        await addOfflineCredit({
          customer_name: credit.customer_name,
          customer_phone: credit.customer_phone || null,
          amount: credit.amount,
          paid_amount: 0,
          remaining_amount: credit.amount,
          due_date: credit.due_date || null,
          status: "pending",
          notes: credit.notes || null,
          credit_type: "cash",
          person_type: "other",
        });
        imported++;
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

    // Subscribe to real-time changes only when online
    if (!isOnline) return;

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
  }, [isOnline]);

  // Update products from offline hook
  useEffect(() => {
    if (offlineProducts.length > 0) {
      setProducts(offlineProducts.map(p => ({
        id: p.id,
        name: p.name,
        selling_price: p.selling_price,
        purchase_price: p.purchase_price,
        stock_quantity: p.stock_quantity,
        quantity_type: p.quantity_type || null,
      })));
    }
  }, [offlineProducts]);

  const fetchPaymentRecords = async () => {
    // First try from IndexedDB
    const localPayments = await offlineDb.getAll<PaymentRecord>('payment_ledger');
    if (localPayments.length > 0) {
      setPaymentRecords(localPayments);
    }

    // Sync from server if online
    if (isOnline) {
      const { data } = await supabase
        .from("payment_ledger")
        .select("id, customer_name, customer_phone, payment_amount, payment_date, description, image_url, notes")
        .order("payment_date", { ascending: false });
      if (data) {
        setPaymentRecords(data);
        // Store in IndexedDB
        await offlineDb.bulkPut('payment_ledger', data, 'synced');
      }
    }
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
    // Products are now loaded from useOfflineProducts hook
    // This function kept for compatibility
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
      let allCredits: Credit[] = [];

      // Get sales data from IndexedDB first
      const localSales = await offlineDb.getAll<any>('sales');
      const salesWithRemaining = localSales
        .filter(sale => sale.customer_name && sale.payment_status !== 'paid' && (sale.final_amount - (sale.paid_amount || 0)) > 0)
        .map(sale => ({
          id: sale.id,
          customer_name: sale.customer_name || "",
          customer_phone: sale.customer_phone || null,
          amount: sale.final_amount,
          paid_amount: sale.paid_amount || 0,
          remaining_amount: sale.final_amount - (sale.paid_amount || 0),
          due_date: null,
          status: sale.payment_status || "pending",
          notes: null,
          created_at: sale.created_at || "",
          invoice_number: sale.invoice_number,
          description: sale.description || null,
          image_url: sale.image_url || null,
          credit_type: "invoice",
          person_type: "customer",
          last_payment_date: null,
        }));
      allCredits = [...allCredits, ...salesWithRemaining];

      // Get cash credits from IndexedDB
      const localCredits = await offlineDb.getAll<any>('credits');
      const cashCredits = localCredits
        .filter(credit => credit.credit_type === 'cash' && credit.remaining_amount > 0)
        .map(credit => ({
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
          last_payment_date: null,
        }));
      allCredits = [...allCredits, ...cashCredits];

      // Sort by created_at
      allCredits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setCredits(allCredits);
      setFilteredCredits(allCredits);

      // Sync with server if online
      if (isOnline) {
        try {
          // Fetch from sales table
          const { data: salesData } = await supabase
            .from("sales")
            .select("*")
            .not("customer_name", "is", null)
            .neq("payment_status", "paid")
            .order("created_at", { ascending: true });

          // Fetch from credits table for cash credits
          const { data: cashCreditsData } = await supabase
            .from("credits")
            .select("*")
            .eq("credit_type", "cash")
            .gt("remaining_amount", 0)
            .order("created_at", { ascending: true });

          // Fetch last payment dates
          const { data: transactionsData } = await supabase
            .from("credit_transactions")
            .select("credit_id, transaction_date")
            .order("transaction_date", { ascending: false });

          const lastPaymentDates: { [key: string]: string } = {};
          if (transactionsData) {
            transactionsData.forEach(t => {
              if (!lastPaymentDates[t.credit_id]) {
                lastPaymentDates[t.credit_id] = t.transaction_date;
              }
            });
          }

          let serverCredits: Credit[] = [];

          if (salesData) {
            const creditsFromSales: Credit[] = salesData
              .filter(sale => (sale.final_amount - (sale.paid_amount || 0)) > 0)
              .map(sale => ({
                id: sale.id,
                customer_name: sale.customer_name || "",
                customer_phone: sale.customer_phone || null,
                amount: sale.final_amount,
                paid_amount: sale.paid_amount || 0,
                remaining_amount: sale.final_amount - (sale.paid_amount || 0),
                due_date: null,
                status: sale.payment_status || "pending",
                notes: null,
                created_at: sale.created_at || "",
                invoice_number: sale.invoice_number,
                description: sale.description || null,
                image_url: sale.image_url || null,
                credit_type: "invoice",
                person_type: "customer",
                last_payment_date: null,
              }));
            serverCredits = [...serverCredits, ...creditsFromSales];
          }

          if (cashCreditsData) {
            const serverCashCredits: Credit[] = cashCreditsData.map(credit => ({
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
            serverCredits = [...serverCredits, ...serverCashCredits];
          }

          serverCredits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setCredits(serverCredits);
          setFilteredCredits(serverCredits);
        } catch (syncError) {
          console.warn('Failed to sync credits from server:', syncError);
        }
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

    if (creditTypeFilter !== "all") {
      filtered = filtered.filter(credit => credit.credit_type === creditTypeFilter);
    }

    setFilteredCredits(filtered);
  };

  const getFilteredCustomerPayments = (customerName: string, customerPhone: string | null, customerKey: string) => {
    const allPayments = getCustomerPayments(customerName, customerPhone);
    const dateFilter = customerPaymentDateFilters[customerKey];
    const today = new Date().toISOString().split('T')[0];
    
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
    
    if (!canCreate) {
      toast.error("You do not have permission to create credits.");
      return;
    }

    const amount = parseFloat(formData.amount);
    
    try {
      await addOfflineCredit({
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || null,
        amount: amount,
        paid_amount: 0,
        remaining_amount: amount,
        due_date: formData.due_date || null,
        status: "pending",
        notes: formData.notes || null,
        credit_type: "cash",
        person_type: "other",
      });
      
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
      // Update credit record via offline hook
      await updateOfflineCredit(selectedCredit.id, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: newStatus,
      });

      // Record payment transaction
      await recordOfflinePayment(selectedCredit.id, payment, fullPayment ? "Full payment received" : "Partial payment received");

      // Update associated sale if online
      if (isOnline) {
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
      }

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
    
    let newStatus = "pending";
    if (newRemainingAmount <= 0) {
      newStatus = "paid";
    } else if (newPaidAmount > 0) {
      newStatus = "partial";
    }

    setIsLoading(true);
    try {
      // Update credit record via offline hook
      await updateOfflineCredit(selectedCredit.id, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: newStatus,
      });

      // Record payment transaction
      const notes = `${cashCreditPaymentData.payment_mode.toUpperCase()}: ${cashCreditPaymentData.notes || "Payment received"}`;
      await recordOfflinePayment(selectedCredit.id, payment, notes);

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
    let saleData: any = null;
    
    // Try to get sale data from IndexedDB first
    const localSales = await offlineDb.getAll<any>('sales');
    saleData = localSales.find(s => 
      s.customer_name === credit.customer_name && 
      s.customer_phone === (credit.customer_phone || "")
    );

    // If online, try to get more detailed data
    if (isOnline && !saleData) {
      const { data, error: saleError } = await supabase
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
      saleData = data;
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
      // Get sale items from IndexedDB
      const localSaleItems = await offlineDb.getAll<any>('sale_items');
      const saleItems = localSaleItems.filter(item => item.sale_id === saleData.id);
      
      if (saleItems.length === 0 && isOnline && saleData.sale_items) {
        // Use items from server response
        if (saleData.sale_items.length === 0) {
          toast.error("WARNING: This sale has no items! Cannot edit safely.");
          console.error("Sale has no items:", saleData.invoice_number);
          return;
        }
      }

      setSaleId(saleData.id);
      setInvoiceNumber(saleData.invoice_number);
      setDiscount(saleData.discount || 0);
      setCurrentPaymentStatus(saleData.payment_status || "");
      
      const itemsToUse = saleItems.length > 0 ? saleItems : (saleData.sale_items || []);
      const items = itemsToUse.map((item: any) => ({
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
    
    if (!canEdit) {
      toast.error("You do not have permission to edit credits.");
      return;
    }

    if (saleId && invoiceItems.length === 0) {
      toast.error("Cannot save invoice without items! Please add at least one product.");
      return;
    }

    try {
      const paidAmt = parseFloat(invoicePaidAmount) || 0;
      
      if (saleId && invoiceItems.length > 0) {
        const { totalAmount, finalAmount } = calculateInvoiceTotals();
        const remainingAmt = finalAmount - paidAmt;

        // Get original items to restore their stock first
        const localSaleItems = await offlineDb.getAll<any>('sale_items');
        const originalItems = localSaleItems.filter(item => item.sale_id === saleId);

        // Restore stock for all original items using offline hook
        console.log("Credits Edit: Restoring stock for original items:", originalItems);
        for (const originalItem of originalItems) {
          const product = products.find(p => p.id === originalItem.product_id);
          if (product) {
            const restoredStock = product.stock_quantity + originalItem.quantity;
            await updateOfflineProduct(originalItem.product_id, { stock_quantity: restoredStock });
          }
        }

        // Update sale in IndexedDB
        const existingSale = await offlineDb.getById<any>('sales', saleId);
        if (existingSale) {
          await offlineDb.put('sales', {
            ...existingSale,
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone || null,
            total_amount: totalAmount,
            discount: discount,
            final_amount: finalAmount,
            paid_amount: paidAmt,
            status: remainingAmt > 0 ? "pending" : "completed",
            payment_status: remainingAmt > 0 ? "pending" : "paid",
          }, 'pending');
        }

        // Delete old sale items from IndexedDB
        for (const oldItem of originalItems) {
          await offlineDb.hardDelete('sale_items', oldItem.id);
        }

        // Insert new sale items and deduct inventory
        for (const item of invoiceItems) {
          await offlineDb.put('sale_items', {
            id: item.id,
            sale_id: saleId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            purchase_price: item.purchase_price,
            total_price: item.total_price,
            profit: item.profit,
          } as any, 'pending');

          // Deduct stock from inventory
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            const newStock = product.stock_quantity - item.quantity;
            if (newStock < 0) {
              toast.error(`Insufficient stock for ${item.product_name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
              throw new Error("Insufficient stock");
            }
            await updateOfflineProduct(item.product_id, { stock_quantity: newStock });
          }
        }

        // Sync with server if online
        if (isOnline) {
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

          await supabase.from("sale_items").delete().eq("sale_id", saleId);

          for (const item of invoiceItems) {
            await supabase.from("sale_items").insert({
              sale_id: saleId,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              purchase_price: item.purchase_price,
              total_price: item.total_price,
              profit: item.profit,
            });
          }
        }

        // Update credit with new invoice totals
        await updateOfflineCredit(selectedCredit.id, {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          amount: finalAmount,
          remaining_amount: remainingAmt,
          paid_amount: paidAmt,
          status: remainingAmt > 0 ? "pending" : "paid",
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        });
      } else {
        // No sale - just update credit payment
        const currentPaid = selectedCredit.paid_amount + paidAmt;
        const newRemainingAmt = selectedCredit.amount - currentPaid;

        await updateOfflineCredit(selectedCredit.id, {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          paid_amount: currentPaid,
          remaining_amount: newRemainingAmt,
          status: newRemainingAmt <= 0 ? "paid" : "pending",
          due_date: formData.due_date || null,
          notes: formData.notes || null,
        });
      }

      // Record payment transaction if payment made
      if (paidAmt > 0) {
        await recordOfflinePayment(
          selectedCredit.id, 
          paidAmt, 
          saleId ? "Payment via invoice edit" : "Direct payment"
        );
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
    if (!canDelete) {
      toast.error("You do not have permission to delete credits.");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this credit record? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Soft delete in IndexedDB
      await offlineDb.softDelete('credits', id);
      
      // Delete from server if online
      if (isOnline) {
        await supabase.from("credits").delete().eq("id", id);
      }
      
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
    if (credit.remaining_amount <= 0) {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    } else if (credit.paid_amount > 0 && credit.remaining_amount > 0) {
      return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
    }
    return <Badge className="bg-destructive text-destructive-foreground">Unpaid</Badge>;
  };

  const getCustomerTotal = (customerCredits: Credit[]) => {
    return customerCredits.reduce((sum, credit) => sum + credit.remaining_amount, 0);
  };

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
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Credit Management</h1>
          <p className="text-muted-foreground mt-1 text-base">Track customer loans and payments</p>
        </div>
        <div className="flex gap-3 items-center">
          <OfflineIndicator />
          <Button 
            onClick={fetchCredits} 
            variant="outline" 
            size="icon"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          {canCreate && (
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              disabled={isLoading || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
          )}
          <Button 
            onClick={() => exportCreditsToCSV(credits)} 
            variant="outline"
            disabled={isLoading || credits.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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

            if (totalRemaining <= 0) return null;

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
                                          <ImageIcon className="h-4 w-4 text-primary hover:opacity-80" />
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
          {Object.keys(groupedCredits).length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No pending credits found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Invoice Edit Dialog */}
      <Dialog open={isInvoiceEditDialogOpen} onOpenChange={setIsInvoiceEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Credit / Invoice
              {invoiceNumber && <Badge variant="outline">{invoiceNumber}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit_customer_name">Customer name *</Label>
                  <Input
                    id="edit_customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_customer_phone">Customer phone</Label>
                  <Input
                    id="edit_customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Invoice Items</Label>
                  <Button type="button" onClick={handleAddInvoiceItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {invoiceItems.map((item, index) => (
                    <Card key={item.id} className="p-4">
                      <div className="grid gap-3 md:grid-cols-5">
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
    </div>
  );
};

export default Credits;
