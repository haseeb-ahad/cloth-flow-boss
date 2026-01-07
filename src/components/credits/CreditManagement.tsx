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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, DollarSign, RefreshCw, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Search } from "lucide-react";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { cleanCustomerName, getOrCreateCustomer, fetchCustomerSuggestions as fetchCustomersFromTable } from "@/lib/customerUtils";

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

interface PaymentFormData {
  amount: string;
  payment_date: string;
  notes: string;
}

const CreditManagement = () => {
  const { ownerId, hasPermission, userRole } = useAuth();
  const { formatDate } = useTimezone();
  
  const canCreate = userRole === "admin" || hasPermission("credits", "create");
  const canEdit = userRole === "admin" || hasPermission("credits", "edit");
  const canDelete = userRole === "admin" || hasPermission("credits", "delete");

  const [activeTab, setActiveTab] = useState<"given" | "taken">("given");
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<CreditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    amount: "",
    payment_date: getLocalDate(),
    notes: "",
  });

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

    const channel = supabase
      .channel('credit-management-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credits' }, () => fetchCredits())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterCredits();
  }, [credits, activeTab, searchTerm]);

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
    let filtered = credits.filter(c => c.credit_type === activeTab);
    
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
      credit_type: activeTab,
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
    setPaymentData({
      amount: "",
      payment_date: getLocalDate(),
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedCredit || !canEdit) {
      toast.error("You do not have permission to record payments");
      return;
    }

    const payment = parseFloat(paymentData.amount);
    if (isNaN(payment) || payment <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (payment > selectedCredit.remaining_amount) {
      toast.error("Payment amount cannot exceed remaining balance");
      return;
    }

    const newPaidAmount = selectedCredit.paid_amount + payment;
    const newRemaining = selectedCredit.remaining_amount - payment;
    
    let newStatus = "partial";
    if (newRemaining <= 0) {
      newStatus = "paid";
    } else if (selectedCredit.due_date && new Date(selectedCredit.due_date) < new Date()) {
      newStatus = "overdue";
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("credits")
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining,
          status: newStatus,
        })
        .eq("id", selectedCredit.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          credit_id: selectedCredit.id,
          customer_name: selectedCredit.party_name,
          amount: payment,
          transaction_date: paymentData.payment_date,
          notes: paymentData.notes || `${selectedCredit.credit_type === "given" ? "Payment received" : "Payment made"}`,
          owner_id: ownerId,
        });

      if (transactionError) throw transactionError;

      toast.success(selectedCredit.credit_type === "given" ? "Payment received" : "Payment made");
      setIsPaymentDialogOpen(false);
      setSelectedCredit(null);
      fetchCredits();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setIsLoading(false);
    }
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
    <div className="space-y-4 md:space-y-6 w-full overflow-x-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message="Loading..." />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 w-full">
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "given" | "taken")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full max-w-full">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-transparent gap-2 max-w-full">
            <TabsTrigger 
              value="given" 
              className="gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=inactive]:bg-muted border data-[state=active]:border-green-300 data-[state=inactive]:border-border"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Credit Given
            </TabsTrigger>
            <TabsTrigger 
              value="taken" 
              className="gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=inactive]:bg-muted border data-[state=active]:border-red-300 data-[state=inactive]:border-border"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Credit Taken
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              onClick={fetchCredits} 
              variant="outline" 
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {canCreate && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setFormData({ ...formData, credit_type: activeTab })}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Credit
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

        {/* Search */}
        <Card className="p-4 mt-4 w-full max-w-full">
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

        <TabsContent value="given" className="mt-4">
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {selectedCredit?.credit_type === "given" ? "Receive Payment" : "Make Payment"}
            </DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Party</span>
                    <span className="font-semibold">{selectedCredit.party_name}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-sm">Rs. {selectedCredit.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold text-sm text-success">Rs. {selectedCredit.paid_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="font-bold text-sm text-warning">Rs. {selectedCredit.remaining_amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div>
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="Enter amount"
                  max={selectedCredit.remaining_amount}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: Rs. {selectedCredit.remaining_amount.toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="payment_notes">Note (Optional)</Label>
                <Textarea
                  id="payment_notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Add a reference..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handlePayment} 
                  className="flex-1"
                  disabled={isLoading || !paymentData.amount}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  {selectedCredit.credit_type === "given" ? "Receive Payment" : "Make Payment"}
                </Button>
                <Button 
                  onClick={() => setIsPaymentDialogOpen(false)} 
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
    <Card className="w-full max-w-full overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Party Name</TableHead>
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
          {credits.map((credit) => (
            <TableRow key={credit.id}>
              <TableCell className="font-medium">
                {credit.party_name}
                {credit.notes && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{credit.notes}</p>
                )}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPayment(credit)}
                      className="gap-1"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      {type === "given" ? "Receive" : "Pay"}
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(credit)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(credit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default CreditManagement;
