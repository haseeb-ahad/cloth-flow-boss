 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { useTimezone } from "@/contexts/TimezoneContext";
 import { Button } from "@/components/ui/button";
 import { toast } from "sonner";
 import { ArrowLeft, DollarSign, RefreshCw } from "lucide-react";
 import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
 import CreditSummaryCards from "./CreditSummaryCards";
 import InvoiceCreditTable, { InvoiceCredit } from "./InvoiceCreditTable";
 import CreditLedger, { LedgerEntry } from "./CreditLedger";
 import ReceivePaymentDialog, { PaymentSubmitData } from "./ReceivePaymentDialog";
 
 interface Customer {
   name: string;
   phone: string | null;
 }
 
 interface CustomerCreditProfileProps {
   customer: Customer;
   onBack: () => void;
 }
 
 const CustomerCreditProfile = ({ customer, onBack }: CustomerCreditProfileProps) => {
   const { ownerId, hasPermission, userRole } = useAuth();
   const { formatDate } = useTimezone();
   const canEdit = userRole === "admin" || hasPermission("credits", "edit");
 
   const [isLoading, setIsLoading] = useState(true);
   const [invoices, setInvoices] = useState<InvoiceCredit[]>([]);
   const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
   const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   // Date filters
   const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");
 
   // Calculate summaries
   const summary = useMemo(() => {
     const totalCreditGiven = invoices.reduce((sum, inv) => sum + inv.invoice_amount, 0);
     const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
     const outstandingBalance = invoices.reduce((sum, inv) => sum + inv.pending_amount, 0);
     return { totalCreditGiven, totalPaid, outstandingBalance };
   }, [invoices]);
 
   const pendingInvoices = useMemo(() => 
     invoices.filter(inv => inv.pending_amount > 0),
   [invoices]);
 
   useEffect(() => {
     fetchCustomerData();
 
     // Real-time subscription
     const channel = supabase
       .channel(`customer-credit-${customer.name}`)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchCustomerData())
       .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_ledger' }, () => fetchCustomerData())
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [customer.name]);
 
   const fetchCustomerData = async () => {
     setIsLoading(true);
     try {
       // Fetch all sales (invoices) for this customer that have credit
       const { data: salesData, error: salesError } = await supabase
         .from("sales")
         .select("*")
         .eq("customer_name", customer.name)
         .order("created_at", { ascending: true });
 
       if (salesError) throw salesError;
 
       // Filter to only those with credit (remaining balance > 0 OR was credit at some point)
       const creditInvoices: InvoiceCredit[] = (salesData || [])
         .filter(sale => {
           const remaining = sale.final_amount - (sale.paid_amount || 0);
           // Include if has remaining balance OR if paid_amount differs from final (was credit)
           return remaining > 0 || (sale.paid_amount && sale.paid_amount < sale.final_amount) || sale.payment_status !== 'paid';
         })
         .map(sale => {
           const remaining = Math.max(0, sale.final_amount - (sale.paid_amount || 0));
           let status: "cleared" | "pending" | "partial" = "pending";
           if (remaining <= 0) status = "cleared";
           else if ((sale.paid_amount || 0) > 0) status = "partial";
 
           return {
             id: sale.id,
             sale_id: sale.id,
             invoice_number: sale.invoice_number,
             invoice_date: sale.created_at?.split('T')[0] || '',
             invoice_amount: sale.final_amount,
             paid_amount: sale.paid_amount || 0,
             pending_amount: remaining,
             status
           };
         });
 
       setInvoices(creditInvoices);
 
       // Fetch payment ledger entries for this customer
       const { data: ledgerData, error: ledgerError } = await supabase
         .from("payment_ledger")
         .select("*")
         .eq("customer_name", customer.name)
         .order("payment_date", { ascending: false });
 
       if (ledgerError) throw ledgerError;
 
       // Build ledger entries including credits (invoices) and payments
       const allEntries: LedgerEntry[] = [];
       let runningBalance = 0;
 
       // First add all credits (invoices) sorted by date
       const creditEntries = creditInvoices.map(inv => ({
         id: `credit-${inv.id}`,
         date: inv.invoice_date,
         transaction_type: "credit_given" as const,
         invoice_number: inv.invoice_number,
         amount: inv.invoice_amount,
         payment_method: null,
         balance_after: 0, // Will calculate
         notes: null
       }));
 
       // Add payment entries from ledger
       const paymentEntries = (ledgerData || []).map((payment: any) => ({
         id: payment.id,
         date: payment.payment_date,
         transaction_type: "payment_received" as const,
         invoice_number: payment.details?.[0]?.invoice_number || null,
         amount: payment.payment_amount,
         payment_method: payment.details?.[0]?.payment_method || "cash",
         balance_after: 0,
         notes: payment.notes
       }));
 
       // Combine and sort by date
       const combined = [...creditEntries, ...paymentEntries]
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
 
       // Calculate running balance
       for (const entry of combined) {
         if (entry.transaction_type === "credit_given") {
           runningBalance += entry.amount;
         } else {
           runningBalance -= entry.amount;
         }
         entry.balance_after = Math.max(0, runningBalance);
         allEntries.push(entry);
       }
 
       // Reverse for display (newest first)
       setLedgerEntries(allEntries.reverse());
 
     } catch (error) {
       console.error("Error fetching customer data:", error);
       toast.error("Failed to load customer data");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleReceivePayment = async (data: PaymentSubmitData) => {
     if (!canEdit) {
       toast.error("You don't have permission to receive payments");
       return;
     }
 
     setIsSubmitting(true);
     try {
       let remainingPayment = data.amount;
       const paymentDetails: any[] = [];
 
       if (data.mode === "specific_invoice" && data.selected_invoice_id) {
         // Specific invoice payment
         const invoice = invoices.find(inv => inv.id === data.selected_invoice_id);
         if (!invoice) throw new Error("Invoice not found");
 
         const allocatedAmount = Math.min(remainingPayment, invoice.pending_amount);
         const newPaidAmount = invoice.paid_amount + allocatedAmount;
         const newRemaining = invoice.invoice_amount - newPaidAmount;
 
         // Update sales record
         const { error: updateError } = await supabase
           .from("sales")
           .update({
             paid_amount: newPaidAmount,
             payment_status: newRemaining <= 0 ? "paid" : "partial"
           })
           .eq("id", invoice.sale_id);
 
         if (updateError) throw updateError;
 
         paymentDetails.push({
           sale_id: invoice.sale_id,
           invoice_number: invoice.invoice_number,
           allocated_amount: allocatedAmount,
           payment_method: data.payment_method
         });
 
       } else {
         // FIFO auto-adjust
         const sortedInvoices = [...pendingInvoices]
           .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
 
         for (const invoice of sortedInvoices) {
           if (remainingPayment <= 0) break;
 
           const allocatedAmount = Math.min(remainingPayment, invoice.pending_amount);
           const newPaidAmount = invoice.paid_amount + allocatedAmount;
           const newRemaining = invoice.invoice_amount - newPaidAmount;
 
           // Update sales record
           const { error: updateError } = await supabase
             .from("sales")
             .update({
               paid_amount: newPaidAmount,
               payment_status: newRemaining <= 0 ? "paid" : "partial"
             })
             .eq("id", invoice.sale_id);
 
           if (updateError) throw updateError;
 
           paymentDetails.push({
             sale_id: invoice.sale_id,
             invoice_number: invoice.invoice_number,
             allocated_amount: allocatedAmount,
             payment_method: data.payment_method
           });
 
           remainingPayment -= allocatedAmount;
         }
       }
 
       // Record in payment ledger
       const { error: ledgerError } = await supabase
         .from("payment_ledger")
         .insert({
           customer_name: customer.name,
           customer_phone: customer.phone,
           payment_amount: data.amount,
           payment_date: data.payment_date,
           details: paymentDetails,
           notes: data.notes || `Payment received via ${data.payment_method}`,
           owner_id: ownerId
         });
 
       if (ledgerError) throw ledgerError;
 
       toast.success(`Payment of Rs. ${data.amount.toLocaleString()} received successfully`);
       setIsPaymentDialogOpen(false);
       fetchCustomerData();
 
     } catch (error) {
       console.error("Error processing payment:", error);
       toast.error("Failed to process payment");
     } finally {
       setIsSubmitting(false);
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
           {canEdit && summary.outstandingBalance > 0 && (
             <Button onClick={() => setIsPaymentDialogOpen(true)} className="gap-2">
               <DollarSign className="h-4 w-4" />
               Receive Payment
             </Button>
           )}
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
       <CreditSummaryCards
         totalCreditGiven={summary.totalCreditGiven}
         totalPaid={summary.totalPaid}
         outstandingBalance={summary.outstandingBalance}
       />
 
       {/* Invoice-wise Credit Table */}
       <InvoiceCreditTable
         invoices={invoices}
         formatDate={formatDate}
         startDate={startDate}
         endDate={endDate}
         onStartDateChange={setStartDate}
         onEndDateChange={setEndDate}
       />
 
       {/* Credit & Payment History */}
       <CreditLedger entries={ledgerEntries} formatDate={formatDate} />
 
       {/* Receive Payment Dialog */}
       <ReceivePaymentDialog
         open={isPaymentDialogOpen}
         onOpenChange={setIsPaymentDialogOpen}
         customer={customer}
         pendingInvoices={pendingInvoices}
         totalOutstanding={summary.outstandingBalance}
         onSubmit={handleReceivePayment}
         isLoading={isSubmitting}
       />
     </div>
   );
 };
 
 export default CustomerCreditProfile;