import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, RefreshCw, Calendar, User, Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportPaymentsToCSV, parsePaymentsCSV } from "@/lib/csvExport";
import { formatDatePKT, formatDateInputPKT } from "@/lib/utils";

interface Customer {
  name: string;
  phone: string | null;
}

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  final_amount: number;
  paid_amount: number;
  remaining_amount: number;
  created_at: string;
}

interface PaymentDetail {
  invoice_id: string;
  invoice_number: string;
  adjusted: number;
}

interface LedgerEntry {
  id: string;
  customer_name: string;
  payment_amount: number;
  payment_date: string;
  details: PaymentDetail[];
  created_at: string;
}

const ReceivePayment = () => {
  const { ownerId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(formatDateInputPKT(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<LedgerEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedPayments = parsePaymentsCSV(text);
      
      if (parsedPayments.length === 0) {
        toast.error("No valid payments found in CSV");
        return;
      }

      let imported = 0;
      for (const payment of parsedPayments) {
        const { error } = await (supabase as any).from("payment_ledger").insert({
          ...payment,
          details: [],
          owner_id: ownerId,
        });
        if (!error) imported++;
      }

      toast.success(`Successfully imported ${imported} payments`);
      fetchRecentPayments();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchRecentPayments();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchUnpaidInvoices(selectedCustomer);
    } else {
      setUnpaidInvoices([]);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data: salesData } = await supabase
        .from("sales")
        .select("customer_name, customer_phone")
        .not("customer_name", "is", null);

      const customerMap = new Map<string, string | null>();
      salesData?.forEach((s) => {
        if (s.customer_name && !customerMap.has(s.customer_name)) {
          customerMap.set(s.customer_name, s.customer_phone);
        }
      });

      const uniqueCustomers = Array.from(customerMap.entries()).map(([name, phone]) => ({
        name,
        phone,
      }));

      setCustomers(uniqueCustomers);
    } catch (error) {
      toast.error("Failed to fetch customers");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnpaidInvoices = async (customerName: string) => {
    try {
      const { data } = await supabase
        .from("sales")
        .select("id, invoice_number, final_amount, paid_amount, created_at")
        .eq("customer_name", customerName)
        .order("created_at", { ascending: true });

      if (data) {
        const unpaid = data
          .map((sale) => ({
            ...sale,
            paid_amount: sale.paid_amount || 0,
            remaining_amount: sale.final_amount - (sale.paid_amount || 0),
          }))
          .filter((sale) => sale.remaining_amount > 0);

        setUnpaidInvoices(unpaid);
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
    }
  };

  const fetchRecentPayments = async () => {
    try {
      // Using any cast because payment_ledger table types are not yet generated
      const { data } = await (supabase as any)
        .from("payment_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        const payments = data.map((entry: any) => ({
          id: entry.id,
          customer_name: entry.customer_name,
          payment_amount: entry.payment_amount,
          payment_date: entry.payment_date,
          details: (entry.details as PaymentDetail[]) || [],
          created_at: entry.created_at,
        }));
        setRecentPayments(payments);
      }
    } catch (error) {
      console.error("Failed to fetch recent payments:", error);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    if (unpaidInvoices.length === 0) {
      toast.error("No unpaid invoices found for this customer");
      return;
    }

    setIsSubmitting(true);
    try {
      let remainingPayment = amount;
      const paymentDetails: PaymentDetail[] = [];

      // FIFO: Apply payment to oldest invoices first
      for (const invoice of unpaidInvoices) {
        if (remainingPayment <= 0) break;

        const adjustedAmount = Math.min(remainingPayment, invoice.remaining_amount);
        const newPaidAmount = invoice.paid_amount + adjustedAmount;
        const newRemainingAmount = invoice.final_amount - newPaidAmount;

        // Determine status
        let status = "pending";
        let paymentStatus = "pending";
        if (newRemainingAmount <= 0) {
          status = "completed";
          paymentStatus = "paid";
        } else if (newPaidAmount > 0) {
          status = "partial";
          paymentStatus = "partial";
        }

        // Update the sale record
        const { error: updateError } = await supabase
          .from("sales")
          .update({
            paid_amount: newPaidAmount,
            payment_status: paymentStatus,
            status: status,
          })
          .eq("id", invoice.id);

        if (updateError) throw updateError;

        // Update associated credit if exists
        const { data: creditData } = await supabase
          .from("credits")
          .select("id, paid_amount")
          .eq("sale_id", invoice.id)
          .maybeSingle();

        if (creditData) {
          const newCreditPaidAmount = (creditData.paid_amount || 0) + adjustedAmount;
          const creditRemainingAmount = invoice.final_amount - newCreditPaidAmount;

          let creditStatus = "pending";
          if (creditRemainingAmount <= 0) {
            creditStatus = "paid";
          } else if (newCreditPaidAmount > 0) {
            creditStatus = "partial";
          }

          await supabase
            .from("credits")
            .update({
              paid_amount: newCreditPaidAmount,
              remaining_amount: creditRemainingAmount,
              status: creditStatus,
            })
            .eq("id", creditData.id);

          // Add credit transaction
          const customer = customers.find((c) => c.name === selectedCustomer);
          await supabase.from("credit_transactions").insert({
            credit_id: creditData.id,
            amount: adjustedAmount,
            transaction_date: paymentDate,
            customer_name: selectedCustomer,
            customer_phone: customer?.phone || null,
            owner_id: ownerId,
          });
        }

        paymentDetails.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          adjusted: adjustedAmount,
        });

        remainingPayment -= adjustedAmount;
      }

      // Save payment ledger entry
      const customer = customers.find((c) => c.name === selectedCustomer);
      // Using any cast because payment_ledger table types are not yet generated
      const { error: ledgerError } = await (supabase as any).from("payment_ledger").insert({
        customer_name: selectedCustomer,
        customer_phone: customer?.phone || null,
        payment_amount: amount,
        payment_date: paymentDate,
        details: paymentDetails,
        owner_id: ownerId,
      });

      if (ledgerError) throw ledgerError;

      toast.success(`Payment of Rs. ${amount.toFixed(2)} applied successfully!`);

      // Reset form
      setPaymentAmount("");
      setSelectedCustomer("");
      setUnpaidInvoices([]);
      fetchRecentPayments();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalUnpaid = () => {
    return unpaidInvoices.reduce((sum, inv) => sum + inv.remaining_amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Banknote className="h-10 w-10 text-primary" />
            Receive Payment
          </h1>
          <p className="text-muted-foreground mt-1 text-base">
            Record customer payments with auto credit adjustment
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCSV}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline"
            disabled={isLoading || isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import CSV
          </Button>
          <Button 
            onClick={() => exportPaymentsToCSV(recentPayments)} 
            variant="outline"
            disabled={isLoading || recentPayments.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => {
              fetchCustomers();
              fetchRecentPayments();
            }}
            variant="outline"
            size="icon"
            disabled={isLoading}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Payment Details
            </h2>
            <div className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select
                  value={selectedCustomer}
                  onValueChange={setSelectedCustomer}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.name} value={customer.name}>
                        {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="font-semibold"
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                onClick={handleSubmitPayment}
                className="w-full"
                disabled={isSubmitting || !selectedCustomer || !paymentAmount}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Banknote className="mr-2 h-4 w-4" />
                    Submit Payment
                  </>
                )}
              </Button>
            </div>

            {/* Customer Unpaid Summary */}
            {selectedCustomer && unpaidInvoices.length > 0 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-3">Unpaid Invoices (FIFO Order)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unpaidInvoices.map((inv, index) => (
                    <div
                      key={inv.id}
                      className="flex justify-between items-center text-sm p-2 bg-background rounded"
                    >
                      <div>
                        <span className="font-medium">#{inv.invoice_number}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatDatePKT(inv.created_at)}
                        </span>
                        {index === 0 && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Oldest
                          </Badge>
                        )}
                      </div>
                      <span className="text-warning font-medium">
                        Rs. {inv.remaining_amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between font-semibold">
                  <span>Total Unpaid:</span>
                  <span className="text-destructive">Rs. {getTotalUnpaid().toFixed(2)}</span>
                </div>
              </div>
            )}

            {selectedCustomer && unpaidInvoices.length === 0 && (
              <div className="mt-6 p-4 bg-success/10 rounded-lg text-center">
                <Badge className="bg-success text-success-foreground">All Paid</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  This customer has no pending invoices
                </p>
              </div>
            )}
          </Card>

          {/* Recent Payments */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent payments</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{payment.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDatePKT(payment.payment_date)}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        Rs. {payment.payment_amount.toFixed(2)}
                      </Badge>
                    </div>
                    {payment.details && payment.details.length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1 mt-2 pt-2 border-t">
                        {payment.details.map((detail, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>#{detail.invoice_number}</span>
                            <span>Rs. {detail.adjusted.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReceivePayment;
