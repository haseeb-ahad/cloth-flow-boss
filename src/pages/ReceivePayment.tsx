import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflinePayments } from "@/hooks/useOfflinePayments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Banknote, RefreshCw, Calendar, User, Download, Upload, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { exportPaymentsToCSV, parsePaymentsCSV } from "@/lib/csvExport";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { OfflineIndicator } from "@/components/OfflineIndicator";

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
  description?: string;
  image_url?: string;
}

const ReceivePayment = () => {
  const { ownerId, hasPermission, userRole } = useAuth();
  const { formatDate, formatDateInput } = useTimezone();
  const { isOnline } = useOffline();
  const { payments: offlinePayments, addPayment: addOfflinePayment, refetch: refetchPayments, isLoading: paymentsLoading } = useOfflinePayments();
  
  // Permission checks - receive payment has its own permission
  const canCreate = userRole === "admin" || hasPermission("receive_payment", "create");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(formatDateInput(new Date()));
  const [description, setDescription] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Map offline payments to LedgerEntry format
  const recentPayments: LedgerEntry[] = offlinePayments.slice(0, 10).map(p => ({
    id: p.id,
    customer_name: p.customer_name,
    payment_amount: p.payment_amount,
    payment_date: p.payment_date,
    details: (p.details as PaymentDetail[]) || [],
    created_at: p.created_at || "",
    description: p.description || undefined,
    image_url: p.image_url || undefined,
  }));

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
        await addOfflinePayment({
          ...payment,
          details: [],
          owner_id: ownerId || "",
          customer_name: payment.customer_name || "",
          payment_amount: payment.payment_amount || 0,
          payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        });
        imported++;
      }

      toast.success(isOnline ? `Successfully imported ${imported} payments` : `${imported} payments saved offline`);
      refetchPayments();
    } catch (error) {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (isOnline) {
      fetchCustomers();
    }

    // Subscribe to real-time changes for instant sync (only when online)
    if (!isOnline) return;

    const salesChannel = supabase
      .channel('receive-payment-sales-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchCustomers();
          if (selectedCustomer) fetchUnpaidInvoices(selectedCustomer);
        }
      )
      .subscribe();

    const paymentLedgerChannel = supabase
      .channel('receive-payment-ledger-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_ledger' },
        () => refetchPayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(paymentLedgerChannel);
    };
  }, [selectedCustomer, isOnline]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${ownerId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("payment-images")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("payment-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmitPayment = async () => {
    // PERMISSION CHECK
    if (!canCreate) {
      toast.error("You do not have permission to receive payments.");
      return;
    }
    
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

          if (creditRemainingAmount <= 0) {
            // Credit is fully paid - delete it permanently
            await supabase.from("credits").delete().eq("id", creditData.id);
          } else {
            // Update credit with new amounts
            await supabase
              .from("credits")
              .update({
                paid_amount: newCreditPaidAmount,
                remaining_amount: creditRemainingAmount,
                status: creditStatus,
              })
              .eq("id", creditData.id);
          }

          // Add credit transaction for payment history
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

      // Upload image if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
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
        description: description || null,
        image_url: imageUrl,
      });

      if (ledgerError) throw ledgerError;

      toast.success(`Payment of Rs. ${amount.toFixed(2)} applied successfully!`);

      // Reset form
      setPaymentAmount("");
      setSelectedCustomer("");
      setDescription("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUnpaidInvoices([]);
      refetchPayments();
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
      {(isLoading || isSubmitting) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message={isSubmitting ? "Processing payment..." : "Loading..."} />
        </div>
      )}
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
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <input
            type="file"
            ref={csvInputRef}
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          {canCreate && (
            <Button 
              onClick={() => csvInputRef.current?.click()} 
              variant="outline"
              disabled={isLoading || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import CSV"}
            </Button>
          )}
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
              refetchPayments();
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

              {/* Description */}
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Enter reason or notes for this payment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[80px]"
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label>Attachment (Optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isSubmitting}
                />
                {imagePreview ? (
                  <div className="relative mt-2">
                    <img
                      src={imagePreview}
                      alt="Payment attachment"
                      className="w-full max-h-40 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={removeImage}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                )}
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
                          {formatDate(inv.created_at)}
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
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        Rs. {payment.payment_amount.toFixed(2)}
                      </Badge>
                    </div>
                    {payment.description && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{payment.description}"
                      </p>
                    )}
                    {payment.image_url && (
                      <div className="mt-2">
                        <img
                          src={payment.image_url}
                          alt="Payment attachment"
                          className="w-full max-h-32 object-cover rounded-lg border cursor-pointer"
                          onClick={() => window.open(payment.image_url, "_blank")}
                        />
                      </div>
                    )}
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
