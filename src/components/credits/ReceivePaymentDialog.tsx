 import { useState, useMemo } from "react";
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
 import type { InvoiceCredit } from "./InvoiceCreditTable";
 
 interface Customer {
   name: string;
   phone: string | null;
 }
 
 interface ReceivePaymentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   customer: Customer;
   pendingInvoices: InvoiceCredit[];
   totalOutstanding: number;
   onSubmit: (data: PaymentSubmitData) => Promise<void>;
   isLoading: boolean;
 }
 
 export interface PaymentSubmitData {
   amount: number;
   payment_date: string;
   payment_method: string;
   notes: string;
   mode: "auto_adjust" | "specific_invoice";
   selected_invoice_id: string | null;
 }
 
 interface PaymentAllocation {
   invoice_id: string;
   invoice_number: string;
   allocated_amount: number;
   new_pending: number;
   will_clear: boolean;
 }
 
 const ReceivePaymentDialog = ({
   open,
   onOpenChange,
   customer,
   pendingInvoices,
   totalOutstanding,
   onSubmit,
   isLoading
 }: ReceivePaymentDialogProps) => {
   const getLocalDate = () => {
     const today = new Date();
     return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
   };
 
   const [amount, setAmount] = useState("");
   const [paymentDate, setPaymentDate] = useState(getLocalDate());
   const [paymentMethod, setPaymentMethod] = useState("cash");
   const [notes, setNotes] = useState("");
   const [mode, setMode] = useState<"auto_adjust" | "specific_invoice">("auto_adjust");
   const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
 
   // Calculate FIFO allocation preview
   const allocationPreview = useMemo((): PaymentAllocation[] => {
     const paymentAmount = parseFloat(amount) || 0;
     if (paymentAmount <= 0) return [];
 
     const allocations: PaymentAllocation[] = [];
     let remainingPayment = paymentAmount;
 
     if (mode === "specific_invoice" && selectedInvoiceId) {
       const invoice = pendingInvoices.find(inv => inv.id === selectedInvoiceId);
       if (invoice) {
         const allocated = Math.min(remainingPayment, invoice.pending_amount);
         allocations.push({
           invoice_id: invoice.id,
           invoice_number: invoice.invoice_number,
           allocated_amount: allocated,
           new_pending: invoice.pending_amount - allocated,
           will_clear: invoice.pending_amount - allocated <= 0
         });
       }
     } else {
       // FIFO: Sort by date (oldest first)
       const sortedInvoices = [...pendingInvoices]
         .filter(inv => inv.pending_amount > 0)
         .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
 
       for (const invoice of sortedInvoices) {
         if (remainingPayment <= 0) break;
 
         const allocated = Math.min(remainingPayment, invoice.pending_amount);
         allocations.push({
           invoice_id: invoice.id,
           invoice_number: invoice.invoice_number,
           allocated_amount: allocated,
           new_pending: invoice.pending_amount - allocated,
           will_clear: invoice.pending_amount - allocated <= 0
         });
         remainingPayment -= allocated;
       }
     }
 
     return allocations;
   }, [amount, mode, selectedInvoiceId, pendingInvoices]);
 
   const maxAmount = mode === "specific_invoice" && selectedInvoiceId
     ? pendingInvoices.find(inv => inv.id === selectedInvoiceId)?.pending_amount || 0
     : totalOutstanding;
 
   const handleSubmit = async () => {
     const paymentAmount = parseFloat(amount);
     if (isNaN(paymentAmount) || paymentAmount <= 0) return;
 
     await onSubmit({
       amount: paymentAmount,
       payment_date: paymentDate,
       payment_method: paymentMethod,
       notes,
       mode,
       selected_invoice_id: mode === "specific_invoice" ? selectedInvoiceId : null
     });
 
     // Reset form
     setAmount("");
     setPaymentDate(getLocalDate());
     setPaymentMethod("cash");
     setNotes("");
     setMode("auto_adjust");
     setSelectedInvoiceId("");
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <DollarSign className="h-5 w-5" />
             Receive Payment
           </DialogTitle>
         </DialogHeader>
 
         <div className="space-y-4">
           {/* Customer Info (Locked) */}
           <Card className="p-3 bg-muted/50">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                 <User className="h-5 w-5 text-primary" />
               </div>
               <div>
                 <p className="font-semibold">{customer.name}</p>
                 <p className="text-sm text-muted-foreground">
                   Outstanding: Rs. {totalOutstanding.toLocaleString()}
                 </p>
               </div>
             </div>
           </Card>
 
           {/* Payment Mode */}
           <div className="space-y-2">
             <Label>Payment Mode</Label>
             <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="flex gap-4">
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="auto_adjust" id="auto_adjust" />
                 <Label htmlFor="auto_adjust" className="font-normal cursor-pointer">
                   Auto-Adjust (FIFO)
                 </Label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="specific_invoice" id="specific_invoice" />
                 <Label htmlFor="specific_invoice" className="font-normal cursor-pointer">
                   Specific Invoice
                 </Label>
               </div>
             </RadioGroup>
           </div>
 
           {/* Select Invoice (if specific mode) */}
           {mode === "specific_invoice" && (
             <div className="space-y-2">
               <Label>Select Invoice</Label>
               <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Choose an invoice" />
                 </SelectTrigger>
                 <SelectContent>
                   {pendingInvoices.filter(inv => inv.pending_amount > 0).map(inv => (
                     <SelectItem key={inv.id} value={inv.id}>
                       {inv.invoice_number} - Pending: Rs. {inv.pending_amount.toLocaleString()}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           )}
 
           {/* Payment Amount */}
           <div className="space-y-2">
             <Label htmlFor="payment_amount">Payment Amount *</Label>
             <Input
               id="payment_amount"
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
             <Label htmlFor="payment_date">Payment Date</Label>
             <Input
               id="payment_date"
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
             <Label htmlFor="notes">Notes (Optional)</Label>
             <Textarea
               id="notes"
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
                   <div key={alloc.invoice_id} className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2">
                       {alloc.will_clear && (
                         <CheckCircle2 className="h-4 w-4 text-success" />
                       )}
                       <span>{alloc.invoice_number}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="text-success">Rs. {alloc.allocated_amount.toLocaleString()}</span>
                       {alloc.will_clear ? (
                         <Badge className="bg-success text-xs">Cleared</Badge>
                       ) : (
                         <span className="text-xs text-muted-foreground">
                           Pending: Rs. {alloc.new_pending.toLocaleString()}
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
               disabled={isLoading || !amount || parseFloat(amount) <= 0 || (mode === "specific_invoice" && !selectedInvoiceId)}
             >
               {isLoading ? (
                 <RefreshCw className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <DollarSign className="h-4 w-4 mr-2" />
               )}
               Receive Payment
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
 
 export default ReceivePaymentDialog;