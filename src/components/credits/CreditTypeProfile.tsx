import { useState, useEffect, useMemo } from "react";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  DollarSign, ArrowDownCircle, ArrowUpCircle, AlertCircle, Search, Filter,
  CalendarIcon, RefreshCw, Edit, Trash2, History, ArrowDownLeft, ArrowUpRight, Hash
} from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import CreditPaymentDialog from "./CreditPaymentDialog";

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

interface LedgerEntry {
  id: string;
  date: string;
  transaction_type: "credit_given" | "payment_received";
  source: "credit" | "credit_payment";
  party_name: string;
  amount: number;
  payment_method: string | null;
  balance_after: number;
  notes: string | null;
  credit_id: string | null;
}

interface CreditTypeProfileProps {
  type: "given" | "taken";
  credits: CreditEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (credit: CreditEntry) => void;
  onDelete: (id: string) => void;
  ownerId: string | null;
  onPaymentComplete: () => void;
}

const CreditTypeProfile = ({
  type,
  credits,
  isLoading,
  onRefresh,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  ownerId,
  onPaymentComplete,
}: CreditTypeProfileProps) => {
  const { formatDate } = useTimezone();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Payment dialog
  const [selectedCredit, setSelectedCredit] = useState<CreditEntry | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Ledger
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  const typeCredits = useMemo(() => credits.filter(c => c.credit_type === type), [credits, type]);

  // Summary
  const summary = useMemo(() => {
    const totalAmount = typeCredits.reduce((sum, c) => sum + c.total_amount, 0);
    const totalPaid = typeCredits.reduce((sum, c) => sum + c.paid_amount, 0);
    const outstanding = typeCredits.reduce((sum, c) => sum + c.remaining_amount, 0);
    return { totalAmount, totalPaid, outstanding };
  }, [typeCredits]);

  // Filtered credits
  const startDateObj = startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined;
  const endDateObj = endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined;

  const filteredCredits = useMemo(() => {
    let filtered = [...typeCredits];
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (startDate) {
      filtered = filtered.filter(c => (c.created_at?.split('T')[0] || '') >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(c => (c.created_at?.split('T')[0] || '') <= endDate);
    }
    return filtered;
  }, [typeCredits, statusFilter, searchTerm, startDate, endDate]);

  // Fetch ledger (credit entries + payments)
  useEffect(() => {
    fetchLedger();
    const channel = supabase
      .channel(`credit-type-ledger-${type}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credits' }, () => fetchLedger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions' }, () => fetchLedger())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [type]);

  const fetchLedger = async () => {
    setIsLedgerLoading(true);
    try {
      // Fetch credit entries
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select("*")
        .eq("credit_type", type)
        .order("created_at", { ascending: true });
      if (creditsError) throw creditsError;

      // Fetch credit transactions
      const { data: txnData, error: txnError } = await supabase
        .from("credit_transactions")
        .select("*, credits!inner(credit_type)")
        .eq("credits.credit_type", type)
        .order("transaction_date", { ascending: true });
      if (txnError) throw txnError;

      const allEntries: LedgerEntry[] = [];
      let runningBalance = 0;

      // Credit entries
      const creditEntries: LedgerEntry[] = (creditsData || []).map(c => ({
        id: `credit-${c.id}`,
        date: c.created_at?.split('T')[0] || '',
        transaction_type: "credit_given" as const,
        source: "credit" as const,
        party_name: c.customer_name,
        amount: c.amount,
        payment_method: null,
        balance_after: 0,
        notes: c.notes,
        credit_id: c.id,
      }));

      // Payment entries
      const paymentEntries: LedgerEntry[] = (txnData || []).map((txn: any) => ({
        id: `txn-${txn.id}`,
        date: txn.transaction_date,
        transaction_type: "payment_received" as const,
        source: "credit_payment" as const,
        party_name: txn.customer_name,
        amount: txn.amount,
        payment_method: null,
        balance_after: 0,
        notes: txn.notes,
        credit_id: txn.credit_id,
      }));

      const combined = [...creditEntries, ...paymentEntries]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const entry of combined) {
        if (entry.transaction_type === "credit_given") {
          runningBalance += entry.amount;
        } else {
          runningBalance -= entry.amount;
        }
        entry.balance_after = Math.max(0, runningBalance);
        allEntries.push(entry);
      }

      setLedgerEntries(allEntries.reverse());
    } catch (error) {
      console.error("Error fetching ledger:", error);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-success text-success-foreground">Cleared</Badge>;
      case "partial": return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
      case "overdue": return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const isGiven = type === "given";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">
                {isGiven ? "Total Credit Given" : "Total Credit Taken"}
              </p>
              <p className="text-xl md:text-2xl font-bold text-primary">
                Rs. {summary.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {isGiven ? "Total credit on record" : "Total borrowed on record"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              {isGiven ? <ArrowDownCircle className="h-5 w-5 text-primary" /> : <ArrowUpCircle className="h-5 w-5 text-primary" />}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-success/10 border-success/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl md:text-2xl font-bold text-success">
                Rs. {summary.totalPaid.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {isGiven ? "Amount received" : "Amount paid back"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl md:text-2xl font-bold text-warning">
                Rs. {summary.outstanding.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Pending amount</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Entry-wise Credit Table */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {isGiven ? "Credit Given Entries" : "Credit Taken Entries"}
          </h3>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[150px] md:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Cleared</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[130px] h-9 justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDateObj!, 'dd/MM/yyyy') : <span>From</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDateObj} onSelect={(d) => setStartDate(d ? format(d, 'yyyy-MM-dd') : '')} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[130px] h-9 justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDateObj!, 'dd/MM/yyyy') : <span>To</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDateObj} onSelect={(d) => setEndDate(d ? format(d, 'yyyy-MM-dd') : '')} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {filteredCredits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No entries found matching the filters
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredCredits.map((credit) => (
                <Card key={credit.id} className="p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">{credit.party_name}</span>
                    </div>
                    {getStatusBadge(credit.status)}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-mono text-muted-foreground">{credit.id.slice(0, 8)}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {credit.created_at ? formatDate(credit.created_at.split('T')[0]) : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded p-1.5">
                      <p className="text-[10px] text-muted-foreground">Amount</p>
                      <p className="text-xs font-semibold">Rs. {credit.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-success/10 rounded p-1.5">
                      <p className="text-[10px] text-muted-foreground">Paid</p>
                      <p className="text-xs font-semibold text-success">Rs. {credit.paid_amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-warning/10 rounded p-1.5">
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                      <p className="text-xs font-bold text-warning">Rs. {credit.remaining_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t">
                    {credit.remaining_amount > 0 && canEdit && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedCredit(credit); setIsPaymentDialogOpen(true); }} className="h-7 gap-1 text-xs">
                        <DollarSign className="h-3 w-3" />
                        {isGiven ? "Receive" : "Pay"}
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
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell className="font-medium">
                        {credit.party_name}
                        {credit.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{credit.notes}</p>}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{credit.id.slice(0, 8)}</span>
                      </TableCell>
                      <TableCell>{credit.created_at ? formatDate(credit.created_at.split('T')[0]) : '-'}</TableCell>
                      <TableCell className="text-right">Rs. {credit.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">Rs. {credit.paid_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-warning">Rs. {credit.remaining_amount.toLocaleString()}</TableCell>
                      <TableCell>{credit.due_date ? formatDate(credit.due_date) : <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{getStatusBadge(credit.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {credit.remaining_amount > 0 && canEdit && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedCredit(credit); setIsPaymentDialogOpen(true); }} className="gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {isGiven ? "Receive" : "Pay"}
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
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Credit & Payment History */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <History className="h-4 w-4" />
          Credit & Payment History
        </h3>

        {isLedgerLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2" />
            <p>No transaction history yet</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {ledgerEntries.map((entry) => (
                <Card key={entry.id} className={`p-3 border ${
                  entry.transaction_type === "payment_received" ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.transaction_type === "payment_received" ? (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                      )}
                      <Badge variant={entry.transaction_type === "payment_received" ? "default" : "secondary"}
                        className={entry.transaction_type === "payment_received" ? "bg-success" : ""}>
                        {entry.source === "credit" ? (isGiven ? "Credit Given" : "Credit Taken") : (isGiven ? "Payment Received" : "Payment Made")}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{entry.party_name}</p>
                      {entry.credit_id && <p className="text-[10px] font-mono text-muted-foreground">#{entry.credit_id.slice(0, 8)}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${entry.transaction_type === "payment_received" ? "text-success" : "text-primary"}`}>
                        {entry.transaction_type === "payment_received" ? "-" : "+"} Rs. {entry.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance: Rs. {entry.balance_after.toLocaleString()}</p>
                    </div>
                  </div>
                  {entry.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{entry.notes}</p>}
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
                    <TableHead>Party Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.id} className={
                      entry.transaction_type === "payment_received" ? "bg-success/5" : "bg-primary/5"
                    }>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.transaction_type === "payment_received" ? (
                            <ArrowDownLeft className="h-4 w-4 text-success" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-primary" />
                          )}
                          <Badge variant={entry.transaction_type === "payment_received" ? "default" : "secondary"}
                            className={entry.transaction_type === "payment_received" ? "bg-success" : ""}>
                            {entry.source === "credit" ? (isGiven ? "Credit Given" : "Credit Taken") : (isGiven ? "Payment Received" : "Payment Made")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{entry.party_name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.credit_id ? entry.credit_id.slice(0, 8) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        entry.transaction_type === "payment_received" ? "text-success" : "text-primary"
                      }`}>
                        {entry.transaction_type === "payment_received" ? "-" : "+"} Rs. {entry.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">{entry.payment_method || "-"}</TableCell>
                      <TableCell className="text-right font-medium">Rs. {entry.balance_after.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Payment Dialog */}
      {selectedCredit && (
        <CreditPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          selectedCredit={selectedCredit}
          creditType={type}
          onPaymentComplete={() => {
            setSelectedCredit(null);
            onPaymentComplete();
            fetchLedger();
          }}
          ownerId={ownerId}
        />
      )}
    </div>
  );
};

export default CreditTypeProfile;
