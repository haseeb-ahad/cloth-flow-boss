import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Phone,
  Copy,
  Upload,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Crown,
  X,
  Hash,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";
import { generateSHA256Hash, validateTransactionId } from "@/lib/secureHash";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  daily_price: number;
  monthly_price: number;
  yearly_price: number;
  duration_months: number;
  is_lifetime: boolean;
}

interface BankSettings {
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  branch_name: string;
  phone_number: string;
  instructions: string;
}

interface UpgradePlanPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const UpgradePlanPopup = ({ open, onOpenChange, onSuccess }: UpgradePlanPopupProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "payment" | "success">("select");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchData();
      setStep("select");
      setSelectedPlan(null);
      setProofFile(null);
      setProofPreview(null);
      setDuplicateError(null);
      setTransactionId("");
      setTransactionError(null);
    }
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .eq("is_lifetime", false)
        .order("monthly_price", { ascending: true });
      setPlans((plansData as Plan[]) || []);

      // Fetch bank settings
      const { data: bankData } = await supabase
        .from("bank_transfer_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      setBankSettings(bankData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please upload an image or PDF file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setDuplicateError(null);
    setIsCheckingDuplicate(true);

    // Check for duplicate using SHA-256
    if (file.type.startsWith("image/") && user) {
      try {
        const imageHash = await generateSHA256Hash(file);
        
        // Check with backend
        const { data, error } = await supabase.functions.invoke("super-admin", {
          body: {
            action: "check_duplicate_image",
            data: {
              image_hash: imageHash,
              admin_id: user.id,
              amount: selectedPlan ? getPlanPrice(selectedPlan) : 0,
            },
          },
        });

        if (data?.is_duplicate) {
          setDuplicateError(data.message);
          toast.error(data.message);
          setIsCheckingDuplicate(false);
          return;
        }
      } catch (error) {
        console.error("Error checking duplicate:", error);
        // Continue even if check fails
      }
    }

    setIsCheckingDuplicate(false);
    setProofFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setProofPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleTransactionIdChange = async (value: string) => {
    setTransactionId(value);
    setTransactionError(null);

    if (!value.trim()) return;

    const validation = validateTransactionId(value);
    if (!validation.valid) {
      setTransactionError(validation.message || null);
      return;
    }

    // Check for duplicate transaction ID
    if (user) {
      try {
        const { data } = await supabase.functions.invoke("super-admin", {
          body: {
            action: "check_duplicate_transaction",
            data: {
              transaction_id: value.trim(),
              admin_id: user.id,
            },
          },
        });

        if (data?.is_duplicate) {
          setTransactionError(data.message);
        }
      } catch (error) {
        console.error("Error checking transaction ID:", error);
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !proofFile || !user) {
      toast.error("Please select a plan and upload payment proof");
      return;
    }

    // Validate transaction ID
    const trimmedTransactionId = transactionId.trim();
    const validation = validateTransactionId(trimmedTransactionId);
    if (!validation.valid) {
      setTransactionError(validation.message || "Invalid transaction ID");
      toast.error(validation.message || "Please enter a valid transaction ID");
      return;
    }

    if (transactionError) {
      toast.error("Please fix the transaction ID error before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate SHA-256 hash for storage
      let imageHash = "";
      if (proofFile.type.startsWith("image/")) {
        imageHash = await generateSHA256Hash(proofFile);
      }

      // Final duplicate check before submission
      if (imageHash) {
        const { data: dupCheck } = await supabase.functions.invoke("super-admin", {
          body: {
            action: "check_duplicate_image",
            data: {
              image_hash: imageHash,
              admin_id: user.id,
              amount: getPlanPrice(selectedPlan),
            },
          },
        });

        if (dupCheck?.is_duplicate) {
          setDuplicateError(dupCheck.message);
          toast.error("This payment proof has already been submitted or approved.");
          setIsSubmitting(false);
          return;
        }
      }

      // Check transaction ID duplicate
      const { data: txCheck } = await supabase.functions.invoke("super-admin", {
        body: {
          action: "check_duplicate_transaction",
          data: {
            transaction_id: trimmedTransactionId,
            admin_id: user.id,
          },
        },
      });

      if (txCheck?.is_duplicate) {
        setTransactionError(txCheck.message);
        toast.error("This transaction ID has already been used.");
        setIsSubmitting(false);
        return;
      }

      // Upload proof to storage
      const fileExt = proofFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Create payment request with transaction ID
      const { data: paymentRequest, error: insertError } = await supabase
        .from("payment_requests")
        .insert({
          admin_id: user.id,
          plan_id: selectedPlan.id,
          amount: getPlanPrice(selectedPlan),
          proof_url: urlData.publicUrl,
          status: "pending",
          transaction_id: trimmedTransactionId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Save image hash and audit log
      await supabase.functions.invoke("super-admin", {
        body: {
          action: "save_payment_with_audit",
          data: {
            image_hash: imageHash,
            admin_id: user.id,
            proof_url: urlData.publicUrl,
            payment_request_id: paymentRequest?.id,
            amount: getPlanPrice(selectedPlan),
            transaction_id: trimmedTransactionId,
            plan_name: selectedPlan.name,
          },
        },
      });

      // Notify about payment upload
      await supabase.functions.invoke("super-admin", {
        body: {
          action: "notify_payment_uploaded",
          data: {
            admin_id: user.id,
            amount: getPlanPrice(selectedPlan),
            plan_name: selectedPlan.name,
            transaction_id: trimmedTransactionId,
          },
        },
      });

      setStep("success");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting payment:", error);
      toast.error(error.message || "Failed to submit payment");
    }
    setIsSubmitting(false);
  };

  const getDurationLabel = (months: number) => {
    if (months >= 12) {
      const years = months / 12;
      return years === 1 ? "1 Year" : `${years} Years`;
    }
    if (months >= 1) {
      return months === 1 ? "1 Month" : `${months} Months`;
    }
    const days = Math.round(months * 30);
    return days === 1 ? "1 Day" : `${days} Days`;
  };

  const getPlanPrice = (plan: Plan): number => {
    const months = plan.duration_months;
    if (months < 1) {
      return plan.daily_price || plan.monthly_price;
    }
    if (months >= 12 && plan.yearly_price > 0) {
      return plan.yearly_price;
    }
    return plan.monthly_price;
  };

  const canSubmit = proofFile && 
    transactionId.trim().length >= 5 && 
    !transactionError && 
    !duplicateError && 
    bankSettings &&
    !isCheckingDuplicate;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <AnimatedLogoLoader size="sm" />
        </div>
      );
    }

    if (step === "success") {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Under Review</h3>
          <p className="text-slate-500 mb-6">
            Your payment proof has been submitted. Your plan will be activated after verification by the admin.
          </p>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      );
    }

    if (step === "payment" && selectedPlan) {
      return (
        <div className="space-y-6">
          {/* Security Notice */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Your payment is protected with SHA-256 encryption and duplicate detection to prevent fraud.
            </p>
          </div>

          {/* Selected Plan Info */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-slate-900">{selectedPlan.name}</span>
              </div>
              <Badge>{getDurationLabel(selectedPlan.duration_months)}</Badge>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              Rs {getPlanPrice(selectedPlan).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Your plan will activate after verification
            </p>
          </div>

          {/* Bank Details */}
          {bankSettings ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                Bank Transfer Details
              </h4>
              <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bank Name</span>
                  <span className="font-medium">{bankSettings.bank_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account Title</span>
                  <span className="font-medium">{bankSettings.account_title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">{bankSettings.account_number}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(bankSettings.account_number, "Account number")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {bankSettings.iban && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">IBAN</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono text-sm">{bankSettings.iban}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(bankSettings.iban, "IBAN")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {bankSettings.branch_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Branch</span>
                    <span className="font-medium">{bankSettings.branch_name}</span>
                  </div>
                )}
                {bankSettings.phone_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> WhatsApp
                    </span>
                    <span className="font-medium">{bankSettings.phone_number}</span>
                  </div>
                )}
              </div>
              {bankSettings.instructions && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">{bankSettings.instructions}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Bank details not configured. Please contact admin.
              </p>
            </div>
          )}

          {/* Transaction ID Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Transaction / Reference ID *
            </Label>
            <Input
              placeholder="Enter your bank transaction ID"
              value={transactionId}
              onChange={(e) => handleTransactionIdChange(e.target.value)}
              className={transactionError ? "border-red-300 focus:border-red-500" : ""}
            />
            {transactionError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {transactionError}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Enter the transaction ID from your bank receipt/SMS
            </p>
          </div>

          {/* Upload Proof */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Payment Screenshot *
            </Label>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
            {isCheckingDuplicate ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-blue-700">Verifying image security...</p>
              </div>
            ) : proofFile ? (
              <div className="relative p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50">
                <div className="flex flex-col gap-3">
                  {proofPreview && (
                    <div className="w-full">
                      <img
                        src={proofPreview}
                        alt="Preview"
                        className="w-full max-h-48 object-contain rounded-lg bg-white"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {!proofPreview && (
                      <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-emerald-800 truncate">{proofFile.name}</p>
                      <p className="text-sm text-emerald-600">
                        {(proofFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : duplicateError ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-red-300 bg-red-50 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">Duplicate Screenshot Detected</p>
                    <p className="text-sm text-red-600 mt-1">{duplicateError}</p>
                    <p className="text-sm text-red-500 mt-2">Click to upload a different image</p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer text-center"
              >
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <p className="font-medium text-slate-700">Click to upload payment screenshot</p>
                <p className="text-sm text-slate-500 mt-1">PNG, JPG, or PDF (max 5MB)</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>
          </div>
        </div>
      );
    }

    // Plan selection step
    return (
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No plans available at the moment.</p>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan);
                setStep("payment");
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                selectedPlan?.id === plan.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-100 hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                <Badge variant="outline">{getDurationLabel(plan.duration_months)}</Badge>
              </div>
              {plan.description && (
                <p className="text-sm text-slate-500 mb-3">{plan.description}</p>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  Rs {getPlanPrice(plan).toLocaleString()}
                </span>
                <span className="text-slate-500">
                  /{" "}
                  {plan.duration_months >= 12
                    ? "year"
                    : plan.duration_months >= 1
                    ? "month"
                    : "day"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "success" ? (
              <>
                <Clock className="w-5 h-5 text-amber-500" />
                Payment Submitted
              </>
            ) : step === "payment" ? (
              <>
                <Building2 className="w-5 h-5 text-blue-500" />
                Bank Transfer
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 text-amber-500" />
                Upgrade Your Plan
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "success"
              ? "Your payment is being reviewed"
              : step === "payment"
              ? "Complete the bank transfer and upload proof"
              : "Choose a plan that suits your needs"}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanPopup;
