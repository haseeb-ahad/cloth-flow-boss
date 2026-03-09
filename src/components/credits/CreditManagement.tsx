import { useState, useEffect, useRef, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, DollarSign, RefreshCw, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Search, Users, ChevronDown, ChevronRight, Hash, History, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { cleanCustomerName, getOrCreateCustomer, fetchCustomerSuggestions as fetchCustomersFromTable } from "@/lib/customerUtils";
import CustomerSearch from "./CustomerSearch";
import CustomerCreditProfile from "./CustomerCreditProfile";
import CreditPaymentDialog from "./CreditPaymentDialog";

interface CustomerSuggestion {
  name: string;
  phone: string | null;
}

interface CreditEntry {
  id: string;
  party_name: string;
  party_phone: string | null;
  credit_type: "given" | "taken";
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  date_complete: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

// PaymentFormData removed - now using CreditPaymentDialog

const CreditManagement = () => {
  const { ownerId, hasPermission, userRole } = useAuth();
  const { formatDate } = useTimezone();
  
  const canCreate = userRole === "admin" || hasPermission("credits", "create");
  const canEdit = userRole === "admin" || hasPermission("credits", "edit");
  const canDelete = userRole === "admin" || hasPermission("credits", "delete");

  const [activeTab, setActiveTab] = useState<"profile" | "given" | "taken">("profile");
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<CreditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Customer profile state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(null);
  const [allCustomersWithCredit, setAllCustomersWithCredit] = useState<CustomerSuggestion[]>([]);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditEntry | null>(null);

  // Customer autocomplete
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Get current local date
  const getLocalDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // Form state
  const [formData, setFormData] = useState({
    party_name: "",
    party_phone: "",
    credit_type: "given" as "given" | "taken",
    total_amount: "",
    credit_date: getLocalDate(),
    due_date: "",
    date_complete: "",
    notes: "",
  });

  // Payment data removed - now using CreditPaymentDialog

  // Summary calculations
  const totalCreditGiven = credits
    .filter(c => c.credit_type === "given")
    .reduce((sum, c) => sum + c.remaining_amount, 0);

  const totalCreditTaken = credits
    .filter(c => c.credit_type === "taken")
    .reduce((sum, c) => sum + c.remaining_amount, 0);

  const totalOverdue = credits
    .filter(c => {
      if (!c.due_date || c.remaining_amount <= 0) return false;
      return new Date(c.due_date) < new Date();
    })
    .reduce((sum, c) => sum + c.remaining_amount, 0);

  useEffect(() => {
    fetchCredits();
    fetchCustomerSuggestions();
    fetchCustomersWithCredit();

    const channel = supabase
      .channel('credit-management-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credits' }, () => {
        fetchCredits();
        fetchCustomersWithCredit();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchCustomersWithCredit();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterCredits();
  }, [credits, activeTab, searchTerm]);

  const fetchCustomersWithCredit = async () => {
    try {
      // Fetch customers who have credit balance from sales
      const { data: salesData, error } = await supabase
        .from("sales")
        .select("customer_name, customer_phone")
        .not("customer_name", "is", null)
        .order("customer_name");

      if (error) throw error;

      // Get unique customers with their phone numbers
      const customerMap = new Map<string, string | null>();
      (salesData || []).forEach((sale: any) => {
        if (sale.customer_name && !customerMap.has(sale.customer_name)) {
          customerMap.set(sale.customer_name, sale.customer_phone);
        }
      });

      const uniqueCustomers: CustomerSuggestion[] = Array.from(customerMap.entries()).map(([name, phone]) => ({
        name,
        phone
      }));

      setAllCustomersWithCredit(uniqueCustomers);
    } catch (error) {
      console.error("Error fetching customers with credit:", error);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCustomerSuggestions = async () => {
    // Fetch from centralized customers table
    const customers = await fetchCustomersFromTable();
    setCustomerSuggestions(customers.map(c => ({ name: c.name, phone: c.phone })));
  };

  const handlePartyNameChange = (value: string) => {
    setFormData({ ...formData, party_name: value });
    
    if (value.length > 0) {
      const searchValue = value.toLowerCase().replace(/\s+/g, '');
      const filtered = customerSuggestions.filter(c => {
        const nameMatch = c.name.toLowerCase().replace(/\s+/g, '').includes(searchValue);
        const phoneMatch = c.phone?.replace(/\s+/g, '').includes(searchValue);
        return nameMatch || phoneMatch;
      });
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer: CustomerSuggestion) => {
    setFormData({
      ...formData,
      party_name: customer.name,
      party_phone: customer.phone || "",
    });
    setShowSuggestions(false);
  };

  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .in("credit_type", ["given", "taken"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedCredits: CreditEntry[] = (data || []).map(credit => ({
        id: credit.id,
        party_name: credit.customer_name,
        party_phone: credit.customer_phone || null,
        credit_type: credit.credit_type as "given" | "taken",
        total_amount: credit.amount,
        paid_amount: credit.paid_amount || 0,
        remaining_amount: credit.remaining_amount,
        due_date: credit.due_date,
        date_complete: (credit as any).date_complete || null,
        status: getStatus(credit),
        notes: credit.notes,
        created_at: credit.created_at || "",
      }));

      setCredits(mappedCredits);
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast.error("Failed to load credits");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = (credit: any): string => {
    if (credit.remaining_amount <= 0) return "paid";
    if (credit.paid_amount > 0) {
      if (credit.due_date && new Date(credit.due_date) < new Date()) return "overdue";
      return "partial";
    }
    if (credit.due_date && new Date(credit.due_date) < new Date()) return "overdue";
    return "pending";
  };

  const filterCredits = () => {
    let filtered = credits.filter(c => c.credit_type === activeTab || activeTab === "profile");
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.party_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCredits(filtered);
  };

  const resetForm = () => {
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    setFormData({
      party_name: "",
      party_phone: "",
      credit_type: activeTab === "given" || activeTab === "taken" ? activeTab : "given",
      total_amount: "",
      credit_date: localDate,
      due_date: "",
      date_complete: "",
      notes: "",
    });
  };

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate) {
      toast.error("You do not have permission to add credits");
      return;
    }

    const amount = parseFloat(formData.total_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!formData.party_name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsLoading(true);
    try {
      // Normalize and register customer
      const cleanedName = cleanCustomerName(formData.party_name);
      let finalCustomerName = cleanedName;
      let finalCustomerPhone = formData.party_phone || null;

      if (ownerId) {
        const customerResult = await getOrCreateCustomer(cleanedName, finalCustomerPhone, ownerId);
        if (customerResult.success && customerResult.customer) {
          finalCustomerName = customerResult.customer.customer_name;
          finalCustomerPhone = customerResult.customer.customer_phone;
        } else if (!customerResult.success && customerResult.error) {
          toast.error(customerResult.error);
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("credits").insert({
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        credit_type: formData.credit_type,
        amount: amount,
        paid_amount: 0,
        remaining_amount: amount,
        created_at: formData.credit_date ? new Date(formData.credit_date).toISOString() : new Date().toISOString(),
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        status: "pending",
        owner_id: ownerId,
      });

      if (error) throw error;

      toast.success("Credit entry added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchCredits();
      fetchCustomerSuggestions(); // Refresh customer list
    } catch (error) {
      console.error("Error adding credit:", error);
      toast.error("Failed to add credit entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit || !canEdit) {
      toast.error("You do not have permission to edit credits");
      return;
    }

    const amount = parseFloat(formData.total_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!formData.party_name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const newRemaining = amount - selectedCredit.paid_amount;
    const newStatus = newRemaining <= 0 ? "paid" : (selectedCredit.paid_amount > 0 ? "partial" : "pending");

    setIsLoading(true);
    try {
      // Normalize and register customer
      const cleanedName = cleanCustomerName(formData.party_name);
      let finalCustomerName = cleanedName;
      let finalCustomerPhone = formData.party_phone || null;

      if (ownerId) {
        const customerResult = await getOrCreateCustomer(cleanedName, finalCustomerPhone, ownerId);
        if (customerResult.success && customerResult.customer) {
          finalCustomerName = customerResult.customer.customer_name;
          finalCustomerPhone = customerResult.customer.customer_phone;
        }
      }

      const { error } = await supabase
        .from("credits")
        .update({
          customer_name: finalCustomerName,
          customer_phone: finalCustomerPhone,
          credit_type: formData.credit_type,
          amount: amount,
          remaining_amount: Math.max(0, newRemaining),
          due_date: formData.due_date || null,
          date_complete: formData.date_complete || null,
          notes: formData.notes || null,
          status: newStatus,
        })
        .eq("id", selectedCredit.id);

      if (error) throw error;

      toast.success("Credit updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCredit(null);
      resetForm();
      fetchCredits();
      fetchCustomerSuggestions(); // Refresh customer list
    } catch (error) {
      console.error("Error updating credit:", error);
      toast.error("Failed to update credit");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCredit = async (id: string) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete credits");
      return;
    }

    if (!confirm("Are you sure you want to delete this credit entry?")) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("credits").delete().eq("id", id);
      if (error) throw error;

      toast.success("Credit deleted successfully");
      fetchCredits();
    } catch (error) {
      console.error("Error deleting credit:", error);
      toast.error("Failed to delete credit");
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentDialog = (credit: CreditEntry) => {
    setSelectedCredit(credit);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentComplete = () => {
    setSelectedCredit(null);
    fetchCredits();
  };

  const openEditDialog = (credit: CreditEntry) => {
    setSelectedCredit(credit);
    setFormData({
      party_name: credit.party_name,
      party_phone: credit.party_phone || "",
      credit_type: credit.credit_type,
      total_amount: credit.total_amount.toString(),
      credit_date: credit.created_at ? credit.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      due_date: credit.due_date || "",
      date_complete: credit.date_complete || "",
      notes: credit.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case "partial":
        return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
      case "overdue":
        return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message="Loading..." />
        </div>
      )}

      {/* Customer Profile View */}
      {selectedCustomer ? (
        <CustomerCreditProfile
          customer={selectedCustomer}
          onBack={() => setSelectedCustomer(null)}
        />
      ) : (
      <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
        <Card className="p-3 md:p-4 bg-success/10 border-success/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Credit Given</p>
              <p className="text-xl md:text-2xl font-bold text-success">Rs. {totalCreditGiven.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Money to receive</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
              <ArrowDownCircle className="h-5 w-5 text-success" />
            </div>
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Credit Taken</p>
              <p className="text-xl md:text-2xl font-bold text-destructive">Rs. {totalCreditTaken.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Money to pay</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
              <ArrowUpCircle className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Overdue</p>
              <p className="text-xl md:text-2xl font-bold text-warning">Rs. {totalOverdue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "profile" | "given" | "taken")}>
        <div className="flex items-center justify-between gap-2 w-full">
            <TabsList className="grid grid-cols-3 bg-transparent gap-2 flex-1">
              <TabsTrigger 
                value="profile" 
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:bg-muted border data-[state=active]:border-primary/30 data-[state=inactive]:border-border"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Credit Profile</span>
                <span className="sm:hidden">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="given" 
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-success/10 data-[state=active]:text-success data-[state=inactive]:bg-muted border data-[state=active]:border-success/30 data-[state=inactive]:border-border"
              >
                <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Credit Given</span>
                <span className="sm:hidden">Given</span>
              </TabsTrigger>
              <TabsTrigger 
                value="taken" 
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive data-[state=inactive]:bg-muted border data-[state=active]:border-destructive/30 data-[state=inactive]:border-border"
              >
                <ArrowUpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Credit Taken</span>
                <span className="sm:hidden">Taken</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2 shrink-0">
              <Button 
                onClick={fetchCredits} 
                variant="outline" 
                size="icon"
                className="h-9 w-9"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              {canCreate && activeTab !== "profile" && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" className="h-9 w-9" onClick={() => setFormData({ ...formData, credit_type: activeTab === "given" ? "given" : "taken" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Credit Entry</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCredit} className="space-y-4">
                      <div className="relative" ref={suggestionRef}>
                        <Label htmlFor="party_name">Party Name *</Label>
                        <Input
                          id="party_name"
                          required
                          placeholder={activeTab === "given" ? "Customer name" : "Supplier name"}
                          value={formData.party_name}
                          onChange={(e) => handlePartyNameChange(e.target.value)}
                          onFocus={() => {
                            if (formData.party_name.length > 0) {
                              const searchValue = formData.party_name.toLowerCase().replace(/\s+/g, '');
                              const filtered = customerSuggestions.filter(c => {
                                const nameMatch = c.name.toLowerCase().replace(/\s+/g, '').includes(searchValue);
                                const phoneMatch = c.phone?.replace(/\s+/g, '').includes(searchValue);
                                return nameMatch || phoneMatch;
                              });
                              setFilteredSuggestions(filtered);
                              setShowSuggestions(filtered.length > 0);
                            }
                          }}
                          autoComplete="off"
                        />
                        {showSuggestions && filteredSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredSuggestions.map((customer, index) => (
                              <div
                                key={index}
                                className="px-3 py-2 hover:bg-accent cursor-pointer flex justify-between items-center"
                                onClick={() => selectCustomer(customer)}
                              >
                                <span className="font-medium">{customer.name}</span>
                                {customer.phone && (
                                  <span className="text-xs text-muted-foreground">{customer.phone}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="party_phone">Phone Number</Label>
                        <Input
                          id="party_phone"
                          type="tel"
                          placeholder="Phone number"
                          value={formData.party_phone}
                          onChange={(e) => setFormData({ ...formData, party_phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="credit_type">Credit Type *</Label>
                        <Select
                          value={formData.credit_type}
                          onValueChange={(v) => setFormData({ ...formData, credit_type: v as "given" | "taken" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="given">Credit Given (To Receive)</SelectItem>
                            <SelectItem value="taken">Credit Taken (To Pay)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="total_amount">Total Amount *</Label>
                        <Input
                          id="total_amount"
                          type="number"
                          required
                          min="1"
                          value={formData.total_amount}
                          onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="credit_date">Credit Date *</Label>
                        <Input
                          id="credit_date"
                          type="date"
                          required
                          value={formData.credit_date}
                          onChange={(e) => setFormData({ ...formData, credit_date: e.target.value })}
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
                        <Label htmlFor="notes">Note (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Any additional notes..."
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        Add Credit Entry
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

        {/* Credit Profile Tab - Customer Search */}
        <TabsContent value="profile" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Customer Credit Profile</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Search for a customer to view their complete credit history, invoice-wise breakdown, and receive payments.
                </p>
                <CustomerSearch
                  customers={allCustomersWithCredit}
                  selectedCustomer={null}
                  onSelect={(customer) => setSelectedCustomer(customer)}
                  onClear={() => {}}
                />
              </div>
              
              {/* Quick list of customers with pending credit */}
              {allCustomersWithCredit.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Customers</h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {allCustomersWithCredit.slice(0, 6).map((customer, index) => (
                      <Card 
                        key={index}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground">{customer.phone}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="given" className="mt-4">
          {/* Search */}
          <Card className="p-4 mb-4 w-full max-w-full">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by party name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </Card>
          <CreditList 
            credits={filteredCredits}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            canEdit={canEdit}
            canDelete={canDelete}
            onPayment={openPaymentDialog}
            onEdit={openEditDialog}
            onDelete={handleDeleteCredit}
            type="given"
          />
        </TabsContent>

        <TabsContent value="taken" className="mt-4">
          {/* Search */}
          <Card className="p-4 mb-4 w-full max-w-full">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by party name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </Card>
          <CreditList 
            credits={filteredCredits}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            canEdit={canEdit}
            canDelete={canDelete}
            onPayment={openPaymentDialog}
            onEdit={openEditDialog}
            onDelete={handleDeleteCredit}
            type="taken"
          />
        </TabsContent>
      </Tabs>
      </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCredit} className="space-y-4">
            <div>
              <Label htmlFor="edit_party_name">Party Name *</Label>
              <Input
                id="edit_party_name"
                required
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_party_phone">Phone Number</Label>
              <Input
                id="edit_party_phone"
                placeholder="Phone number"
                value={formData.party_phone}
                onChange={(e) => setFormData({ ...formData, party_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_credit_type">Credit Type *</Label>
              <Select
                value={formData.credit_type}
                onValueChange={(value: "given" | "taken") => setFormData({ ...formData, credit_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="given">Credit Given (To Receive)</SelectItem>
                  <SelectItem value="taken">Credit Taken (To Pay)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_total_amount">Total Amount *</Label>
              <Input
                id="edit_total_amount"
                type="number"
                required
                min="1"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              />
              {selectedCredit && (
                <p className="text-xs text-muted-foreground mt-1">
                  Already paid: Rs. {selectedCredit.paid_amount.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit_credit_date">Credit Date *</Label>
              <Input
                id="edit_credit_date"
                type="date"
                required
                value={formData.credit_date}
                onChange={(e) => setFormData({ ...formData, credit_date: e.target.value })}
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
              <Label htmlFor="edit_notes">Note</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              Update Credit
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - FIFO Auto-Adjust */}
      {selectedCredit && (
        <CreditPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          selectedCredit={selectedCredit}
          creditType={selectedCredit.credit_type}
          onPaymentComplete={handlePaymentComplete}
          ownerId={ownerId}
        />
      )}
    </div>
  );
};

interface CreditListProps {
  credits: CreditEntry[];
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  canEdit: boolean;
  canDelete: boolean;
  onPayment: (credit: CreditEntry) => void;
  onEdit: (credit: CreditEntry) => void;
  onDelete: (id: string) => void;
  type: "given" | "taken";
}

interface GroupedCustomer {
  name: string;
  phone: string | null;
  entries: CreditEntry[];
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  hasOverdue: boolean;
}

const CreditList = ({ 
  credits, 
  formatDate, 
  getStatusBadge, 
  canEdit, 
  canDelete, 
  onPayment, 
  onEdit, 
  onDelete,
  type 
}: CreditListProps) => {
  const [openCustomers, setOpenCustomers] = useState<Set<string>>(new Set());

  const toggleCustomer = (name: string) => {
    setOpenCustomers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Group credits by customer
  const grouped: GroupedCustomer[] = useMemo(() => {
    const map = new Map<string, GroupedCustomer>();
    for (const credit of credits) {
      const existing = map.get(credit.party_name);
      if (existing) {
        existing.entries.push(credit);
        existing.totalAmount += credit.total_amount;
        existing.totalPaid += credit.paid_amount;
        existing.totalRemaining += credit.remaining_amount;
        if (credit.status === "overdue") existing.hasOverdue = true;
      } else {
        map.set(credit.party_name, {
          name: credit.party_name,
          phone: credit.party_phone,
          entries: [credit],
          totalAmount: credit.total_amount,
          totalPaid: credit.paid_amount,
          totalRemaining: credit.remaining_amount,
          hasOverdue: credit.status === "overdue",
        });
      }
    }
    return Array.from(map.values());
  }, [credits]);

  if (credits.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No credits found</p>
          <p className="text-sm mt-1">
            {type === "given" 
              ? "Add credit entries for customers who owe you money" 
              : "Add credit entries for suppliers you owe money to"}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-3">
        {grouped.map((group) => (
          <Collapsible
            key={group.name}
            open={openCustomers.has(group.name)}
            onOpenChange={() => toggleCustomer(group.name)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'} • Remaining: Rs. {group.totalRemaining.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {group.hasOverdue && <Badge className="bg-destructive text-destructive-foreground text-[10px]">Overdue</Badge>}
                    {openCustomers.has(group.name) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t space-y-0 divide-y">
                  {group.entries.map((credit) => (
                    <div key={credit.id} className="p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono text-muted-foreground">{credit.id.slice(0, 8)}</span>
                        <span className="ml-auto">{getStatusBadge(credit.status)}</span>
                      </div>
                      {credit.notes && (
                        <p className="text-xs text-muted-foreground truncate mb-2">{credit.notes}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                          <p className="text-xs font-semibold">Rs. {credit.total_amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-success/10 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                          <p className="text-xs font-semibold text-success">Rs. {credit.paid_amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-warning/10 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Due</p>
                          <p className="text-xs font-bold text-warning">Rs. {credit.remaining_amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-dashed">
                        <div className="text-xs text-muted-foreground">
                          <span>{credit.created_at ? formatDate(credit.created_at.split('T')[0]) : '-'}</span>
                          {credit.due_date && <span className="ml-2">Due: {formatDate(credit.due_date)}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {credit.remaining_amount > 0 && canEdit && (
                            <Button size="sm" variant="outline" onClick={() => onPayment(credit)} className="h-7 gap-1 text-xs">
                              <DollarSign className="h-3 w-3" />
                              {type === "given" ? "Receive" : "Pay"}
                            </Button>
                          )}
                          {canEdit && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(credit)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(credit.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Party Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Paid Amount</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Credit Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <Collapsible key={group.name} asChild open={openCustomers.has(group.name)} onOpenChange={() => toggleCustomer(group.name)}>
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow className="cursor-pointer bg-muted/30 hover:bg-muted/50 font-medium">
                      <TableCell className="w-8 px-2">
                        {openCustomers.has(group.name) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          {group.name}
                          <Badge variant="secondary" className="text-[10px]">{group.entries.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">—</TableCell>
                      <TableCell className="text-right font-semibold">Rs. {group.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success font-semibold">Rs. {group.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-warning">Rs. {group.totalRemaining.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        {group.hasOverdue && <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <>
                      {group.entries.map((credit) => (
                        <TableRow key={credit.id} className="bg-background">
                          <TableCell></TableCell>
                          <TableCell>
                            {credit.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{credit.notes}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{credit.id.slice(0, 8)}</span>
                          </TableCell>
                          <TableCell className="text-right">Rs. {credit.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-success">Rs. {credit.paid_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold text-warning">
                            Rs. {credit.remaining_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {credit.created_at ? formatDate(credit.created_at.split('T')[0]) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {credit.due_date ? formatDate(credit.due_date) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{getStatusBadge(credit.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {credit.remaining_amount > 0 && canEdit && (
                                <Button size="sm" variant="outline" onClick={() => onPayment(credit)} className="gap-1">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {type === "given" ? "Receive" : "Pay"}
                                </Button>
                              )}
                              {canEdit && (
                                <Button size="icon" variant="ghost" onClick={() => onEdit(credit)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(credit.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};

export default CreditManagement;
