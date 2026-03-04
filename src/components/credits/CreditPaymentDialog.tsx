import { useState, useMemo, useEffect } from "react";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, RefreshCw, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CreditEntry {
  id: string;
  party_name: string;
  party_phone: string | null;
  credit_type: "given" | "taken";
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  created_at: string;
  notes: string | null;
}

interface CreditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCredit: CreditEntry;
  creditType: "given" | "taken";
  onPaymentComplete: () => void;
  ownerId: string | null;
}

interface CreditAllocation {
  credit_id: string;
  credit_label: string;
  allocated_amount: number;
  new_remaining: number;
  will_clear: boolean;
}

const CreditPaymentDialog = ({
  open,
  onOpenChange,
  selectedCredit,
  creditType,
  onPaymentComplete,
  ownerId
}: CreditPaymentDialogProps) => {
  const getLocalDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalDate());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"auto_adjust" | "specific_credit">("auto_adjust");
  const [selectedCreditId, setSelectedCreditId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [allPendingCredits, setAllPendingCredits] = useState<CreditEntry[]>([]);
  const [isFetchingCredits, setIsFetchingCredits] = useState(false);

  // Fetch all pending credits for same party when dialog opens
  useEffect(() => {
    if (open && selectedCredit) {
      fetchAllPendingCredits();
      setAmount("");
      setPaymentDate(getLocalDate());
      setPaymentMethod("cash");
      setNotes("");
      setMode("auto_adjust");
      setSelectedCreditId("");
    }
  }, [open, selectedCredit?.party_name]);

  const fetchAllPendingCredits = async () => {
    setIsFetchingCredits(true);
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("customer_name", selectedCredit.party_name)
        .eq("credit_type", creditType)
        .gt("remaining_amount", 0)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mapped: CreditEntry[] = (data || []).map(c => ({
        id: c.id,
        party_name: c.customer_name,
        party_phone: c.customer_phone || null,
        credit_type: c.credit_type as "given" | "taken",
        total_amount: c.amount,
        paid_amount: c.paid_amount || 0,
        remaining_amount: c.remaining_amount,
        due_date: c.due_date,
        created_at: c.created_at || "",
        notes: c.notes,
      }));

      setAllPendingCredits(mapped);
    } catch (error) {
      console.error("Error fetching pending credits:", error);
    } finally {
      setIsFetchingCredits(false);
    }
  };

  const totalOutstanding = useMemo(() =>
    allPendingCredits.reduce((sum, c) => sum + c.remaining_amount, 0),
    [allPendingCredits]
  );

  const maxAmount = mode === "specific_credit" && selectedCreditId
    ? allPendingCredits.find(c => c.id === selectedCreditId)?.remaining_amount || 0
    : totalOutstanding;

  // FIFO allocation preview
  const allocationPreview = useMemo((): CreditAllocation[] => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) return [];

    const allocations: CreditAllocation[] = [];
    let remainingPayment = paymentAmount;

    if (mode === "specific_credit" && selectedCreditId) {
      const credit = allPendingCredits.find(c => c.id === selectedCreditId);
      if (credit) {
        const allocated = Math.min(remainingPayment, credit.remaining_amount);
        allocations.push({
          credit_id: credit.id,
          credit_label: `${credit.party_name} - Rs. ${credit.total_amount.toLocaleString()} (${credit.created_at ? new Date(credit.created_at).toLocaleDateString() : ''})`,
          allocated_amount: allocated,
          new_remaining: credit.remaining_amount - allocated,
          will_clear: credit.remaining_amount - allocated <= 0
        });
      }
    } else {
      // FIFO: oldest first (already sorted by created_at asc)
      for (const credit of allPendingCredits) {
        if (remainingPayment <= 0) break;

        const allocated = Math.min(remainingPayment, credit.remaining_amount);
        allocations.push({
          credit_id: credit.id,
          credit_label: `Rs. ${credit.total_amount.toLocaleString()} (${credit.created_at ? new Date(credit.created_at).toLocaleDateString() : ''})`,
          allocated_amount: allocated,
          new_remaining: credit.remaining_amount - allocated,
          will_clear: credit.remaining_amount - allocated <= 0
        });
        remainingPayment -= allocated;
      }
    }

    return allocations;
  }, [amount, mode, selectedCreditId, allPendingCredits]);

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;
    if (paymentAmount > maxAmount) return;

    setIsLoading(true);
    try {
      let remainingPayment = paymentAmount;
      const creditsToProcess = mode === "specific_credit" && selectedCreditId
        ? allPendingCredits.filter(c => c.id === selectedCreditId)
        : [...allPendingCredits]; // already sorted oldest first

      for (const credit of creditsToProcess) {
        if (remainingPayment <= 0) break;

        const allocated = Math.min(remainingPayment, credit.remaining_amount);
        const newPaid = credit.paid_amount + allocated;
        const newRemaining = credit.remaining_amount - allocated;

        let newStatus = "partial";
        if (newRemaining <= 0) newStatus = "paid";
        else if (credit.due_date && new Date(credit.due_date) < new Date()) newStatus = "overdue";

        // Update credit record
        const { error: updateError } = await supabase
          .from("credits")
          .update({
            paid_amount: newPaid,
            remaining_amount: Math.max(0, newRemaining),
            status: newStatus,
          })
          .eq("id", credit.id);

        if (updateError) throw updateError;

        // Record transaction
        const { error: txnError } = await supabase
          .from("credit_transactions")
          .insert({
            credit_id: credit.id,
            customer_name: credit.party_name,
            amount: allocated,
            transaction_date: paymentDate,
            notes: notes || `${creditType === "given" ? "Payment received" : "Payment made"} - ${paymentMethod} (Auto ID: ${credit.id.slice(0, 8)})`,
            owner_id: ownerId,
          });

        if (txnError) throw txnError;

        remainingPayment -= allocated;
      }

      const successMsg = creditType === "given" ? "Payment received" : "Payment made";
      onPaymentComplete();
      onOpenChange(false);

      // Toast is handled by parent after refetch
      const { toast } = await import("sonner");
      toast.success(`${successMsg} - Rs. ${paymentAmount.toLocaleString()}`);

    } catch (error) {
      console.error("Error processing payment:", error);
      const { toast } = await import("sonner");
      toast.error("Failed to process payment");
    } finally {
      setIsLoading(false);
    }
  };

  const isGiven = creditType === "given";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {isGiven ? "Receive Payment" : "Make Payment"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Party Info */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{selectedCredit.party_name}</p>
                <p className="text-sm text-muted-foreground">
                  Total Outstanding: Rs. {totalOutstanding.toLocaleString()}
                  {allPendingCredits.length > 1 && (
                    <span className="ml-1">({allPendingCredits.length} entries)</span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* Payment Mode - only show if multiple entries */}
          {allPendingCredits.length > 1 && (
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto_adjust" id="credit_auto_adjust" />
                  <Label htmlFor="credit_auto_adjust" className="font-normal cursor-pointer">
                    Auto-Adjust (FIFO)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific_credit" id="specific_credit" />
                  <Label htmlFor="specific_credit" className="font-normal cursor-pointer">
                    Specific Entry
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Select specific credit entry */}
          {mode === "specific_credit" && allPendingCredits.length > 1 && (
            <div className="space-y-2">
              <Label>Select Credit Entry</Label>
              <Select value={selectedCreditId} onValueChange={setSelectedCreditId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a credit entry" />
                </SelectTrigger>
                <SelectContent>
                  {allPendingCredits.filter(c => c.remaining_amount > 0).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      Rs. {c.total_amount.toLocaleString()} - Remaining: Rs. {c.remaining_amount.toLocaleString()} ({c.created_at ? new Date(c.created_at).toLocaleDateString() : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="credit_payment_amount">Payment Amount *</Label>
            <Input
              id="credit_payment_amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              max={maxAmount}
            />
            <p className="text-xs text-muted-foreground">
              Max: Rs. {maxAmount.toLocaleString()}
            </p>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="credit_payment_date">Payment Date</Label>
            <Input
              id="credit_payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI / Mobile</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="credit_payment_notes">Notes (Optional)</Label>
            <Textarea
              id="credit_payment_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a reference..."
              rows={2}
            />
          </div>

          {/* Allocation Preview */}
          {allocationPreview.length > 0 && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Payment Allocation Preview
              </p>
              <div className="space-y-2">
                {allocationPreview.map(alloc => (
                  <div key={alloc.credit_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {alloc.will_clear && (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      )}
                      <span className="truncate text-xs">{alloc.credit_label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-success">Rs. {alloc.allocated_amount.toLocaleString()}</span>
                      {alloc.will_clear ? (
                        <Badge className="bg-success text-xs">Cleared</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Left: Rs. {alloc.new_remaining.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount || (mode === "specific_credit" && allPendingCredits.length > 1 && !selectedCreditId)}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              {isGiven ? "Receive Payment" : "Make Payment"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditPaymentDialog;
