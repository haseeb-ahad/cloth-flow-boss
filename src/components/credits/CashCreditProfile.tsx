import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, RefreshCw, ArrowDownCircle, ArrowUpCircle, AlertCircle, Clock, CheckCircle } from "lucide-react";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface Customer {
  name: string;
  phone: string | null;
}

interface CreditEntry {
  id: string;
  credit_type: "given" | "taken";
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface TransactionEntry {
  id: string;
  date: string;
  transaction_type: "credit_given" | "credit_taken" | "payment_received" | "payment_made";
  amount: number;
  balance_after: number;
  notes: string | null;
}

interface CashCreditProfileProps {
  customer: Customer;
  onBack: () => void;
}

const CashCreditProfile = ({ customer, onBack }: CashCreditProfileProps) => {
  const { ownerId, hasPermission, userRole } = useAuth();
  const { formatDate } = useTimezone();
  const canEdit = userRole === "admin" || hasPermission("credits", "edit");

  const [isLoading, setIsLoading] = useState(true);
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([]);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CreditEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  // Calculate summaries - only for "given" type credits
  const summary = useMemo(() => {
    const givenCredits = creditEntries.filter(e => e.credit_type === "given");
    const totalCreditGiven = givenCredits.reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = givenCredits.reduce((sum, e) => sum + e.paid_amount, 0);
    const outstandingBalance = givenCredits.reduce((sum, e) => sum + e.remaining_amount, 0);
    return { totalCreditGiven, totalPaid, outstandingBalance };
  }, [creditEntries]);

  const pendingEntries = useMemo(() =>
    creditEntries.filter(e => e.remaining_amount > 0 && e.credit_type === "given"),
  [creditEntries]);

  useEffect(() => {
    fetchCustomerData();

    // Real-time subscription
    const channel = supabase
      .channel(`cash-credit-${customer.name}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credits' }, () => fetchCustomerData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions' }, () => fetchCustomerData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer.name]);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      // Fetch all cash credit entries for this customer from credits table
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select("*")
        .eq("customer_name", customer.name)
        .in("credit_type", ["given", "taken"])
        .order("created_at", { ascending: true });

      if (creditsError) throw creditsError;

      const entries: CreditEntry[] = (creditsData || []).map(credit => ({
        id: credit.id,
        credit_type: credit.credit_type as "given" | "taken",
        amount: credit.amount,
        paid_amount: credit.paid_amount || 0,
        remaining_amount: credit.remaining_amount,
        due_date: credit.due_date,
        status: getStatus(credit),
        notes: credit.notes,
        created_at: credit.created_at || ""
      }));

      setCreditEntries(entries);

      // Fetch transactions from credit_transactions table
      const creditIds = entries.map(e => e.id);
      let transactionEntries: TransactionEntry[] = [];

      if (creditIds.length > 0) {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("credit_transactions")
          .select("*")
          .in("credit_id", creditIds)
          .order("transaction_date", { ascending: true });

        if (transactionsError) throw transactionsError;

        // Build transaction history
        transactionEntries = (transactionsData || []).map((t: any) => ({
          id: t.id,
          date: t.transaction_date,
          transaction_type: "payment_received" as const,
          amount: t.amount,
          balance_after: 0, // Will calculate
          notes: t.notes
        }));
      }

      // Add credit entries as transactions
      const creditTransactions: TransactionEntry[] = entries.map(e => ({
        id: `credit-${e.id}`,
        date: e.created_at.split('T')[0],
        transaction_type: e.credit_type === "given" ? "credit_given" as const : "credit_taken" as const,
        amount: e.amount,
        balance_after: 0,
        notes: e.notes
      }));

      // Combine and sort by date
      const combined = [...creditTransactions, ...transactionEntries]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance (only for "given" type)
      let runningBalance = 0;
      for (const entry of combined) {
        if (entry.transaction_type === "credit_given") {
          runningBalance += entry.amount;
        } else if (entry.transaction_type === "payment_received") {
          runningBalance -= entry.amount;
        }
        entry.balance_after = Math.max(0, runningBalance);
      }

      // Reverse for display (newest first)
      setTransactions(combined.reverse());

    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast.error("Failed to load customer data");
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

  const openPaymentDialog = (entry: CreditEntry) => {
    setSelectedEntry(entry);
    setPaymentData({
      amount: "",
      payment_date: new Date().toISOString().split('T')[0],
      notes: ""
    });
    setIsPaymentDialogOpen(true);
  };

  const handleReceivePayment = async () => {
    if (!selectedEntry || !canEdit) {
      toast.error("You don't have permission to receive payments");
      return;
    }

    const payment = parseFloat(paymentData.amount);
    if (isNaN(payment) || payment <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (payment > selectedEntry.remaining_amount) {
      toast.error("Payment amount cannot exceed remaining balance");
      return;
    }

    setIsSubmitting(true);
    try {
      const newPaidAmount = selectedEntry.paid_amount + payment;
      const newRemaining = selectedEntry.remaining_amount - payment;
      
      let newStatus = "partial";
      if (newRemaining <= 0) {
        newStatus = "paid";
      } else if (selectedEntry.due_date && new Date(selectedEntry.due_date) < new Date()) {
        newStatus = "overdue";
      }

      // Update credit entry
      const { error: updateError } = await supabase
        .from("credits")
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining,
          status: newStatus,
        })
        .eq("id", selectedEntry.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          credit_id: selectedEntry.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          amount: payment,
          transaction_date: paymentData.payment_date,
          notes: paymentData.notes || "Payment received",
          owner_id: ownerId,
        });

      if (transactionError) throw transactionError;

      toast.success(`Payment of Rs. ${payment.toLocaleString()} received successfully`);
      setIsPaymentDialogOpen(false);
      setSelectedEntry(null);
      fetchCustomerData();

    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit_given":
        return <ArrowDownCircle className="h-4 w-4 text-success" />;
      case "credit_taken":
        return <ArrowUpCircle className="h-4 w-4 text-destructive" />;
      case "payment_received":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "payment_made":
        return <CheckCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "credit_given":
        return <Badge className="bg-primary/20 text-primary">Credit Given</Badge>;
      case "credit_taken":
        return <Badge className="bg-destructive/20 text-destructive">Credit Taken</Badge>;
      case "payment_received":
        return <Badge className="bg-success text-success-foreground">Payment Received</Badge>;
      case "payment_made":
        return <Badge className="bg-success text-success-foreground">Payment Made</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <AnimatedLogoLoader size="md" showMessage message="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchCustomerData}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Customer Card */}
      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold">{customer.name}</h2>
          {customer.phone && (
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 md:p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Credit Given</p>
              <p className="text-xl md:text-2xl font-bold text-primary">Rs. {summary.totalCreditGiven.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Cash Udhar</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <ArrowDownCircle className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-success/10 border-success/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl md:text-2xl font-bold text-success">Rs. {summary.totalPaid.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Amount received</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </div>
        </Card>
        <Card className="p-3 md:p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl md:text-2xl font-bold text-warning">Rs. {summary.outstandingBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending amount</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Entry-wise Debt Table */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Entry-wise Credit
        </h3>

        {creditEntries.filter(e => e.credit_type === "given").length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No cash credit entries found
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {creditEntries.filter(e => e.credit_type === "given").map((entry) => (
                <Card key={entry.id} className="p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at.split('T')[0])}
                    </span>
                    {getStatusBadge(entry.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-muted/50 rounded p-1.5">
                      <p className="text-[10px] text-muted-foreground">Amount</p>
                      <p className="text-xs font-semibold">Rs. {entry.amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-success/10 rounded p-1.5">
                      <p className="text-[10px] text-muted-foreground">Paid</p>
                      <p className="text-xs font-semibold text-success">Rs. {entry.paid_amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-warning/10 rounded p-1.5">
                      <p className="text-[10px] text-muted-foreground">Remaining</p>
                      <p className="text-xs font-bold text-warning">Rs. {entry.remaining_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  {entry.remaining_amount > 0 && canEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => openPaymentDialog(entry)}
                    >
                      <DollarSign className="h-3 w-3" />
                      Receive
                    </Button>
                  )}
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditEntries.filter(e => e.credit_type === "given").map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.created_at.split('T')[0])}</TableCell>
                      <TableCell className="text-right">Rs. {entry.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">Rs. {entry.paid_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-warning">
                        Rs. {entry.remaining_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{entry.due_date ? formatDate(entry.due_date) : "-"}</TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        {entry.remaining_amount > 0 && canEdit && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-1"
                            onClick={() => openPaymentDialog(entry)}
                          >
                            <DollarSign className="h-3 w-3" />
                            Receive
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Transaction History */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Credit & Payment History
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {transactions.map((t) => (
                <Card key={t.id} className="p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(t.date)}
                    </span>
                    {getTransactionBadge(t.transaction_type)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${
                      t.transaction_type === "credit_given" || t.transaction_type === "credit_taken" 
                        ? "text-primary" 
                        : "text-success"
                    }`}>
                      {t.transaction_type.includes("payment") ? "- " : "+ "}
                      Rs. {t.amount.toLocaleString()}
                    </span>
                    <span className="text-sm">
                      Balance: Rs. {t.balance_after.toLocaleString()}
                    </span>
                  </div>
                  {t.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>
                  )}
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className={
                      t.transaction_type.includes("payment") ? "bg-success/5" : ""
                    }>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(t.transaction_type)}
                          {getTransactionBadge(t.transaction_type)}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        t.transaction_type.includes("payment") 
                          ? "text-success" 
                          : "text-primary"
                      }`}>
                        {t.transaction_type.includes("payment") ? "- " : "+ "}
                        Rs. {t.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs. {t.balance_after.toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {t.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEntry && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Remaining Balance:</span>{" "}
                  <span className="font-bold text-warning">
                    Rs. {selectedEntry.remaining_amount.toLocaleString()}
                  </span>
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="payment_amount">Payment Amount *</Label>
              <Input
                id="payment_amount"
                type="number"
                min="1"
                max={selectedEntry?.remaining_amount}
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment_notes">Notes</Label>
              <Textarea
                id="payment_notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReceivePayment} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Receive Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashCreditProfile;
