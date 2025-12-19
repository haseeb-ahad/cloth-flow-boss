import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, Phone, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface BankSettings {
  id?: string;
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  branch_name: string;
  phone_number: string;
  instructions: string;
}

const SuperAdminBankSettings = () => {
  const [settings, setSettings] = useState<BankSettings>({
    bank_name: "",
    account_title: "",
    account_number: "",
    iban: "",
    branch_name: "",
    phone_number: "",
    instructions: "Transfer the amount to the above account and upload the payment screenshot. Your plan will be activated after verification.",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_bank_settings" },
      });

      if (error) throw error;
      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching bank settings:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!settings.bank_name || !settings.account_title || !settings.account_number) {
      toast.error("Please fill in required fields: Bank Name, Account Title, Account Number");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke("super-admin", {
        body: { action: "save_bank_settings", data: settings },
      });

      if (error) throw error;
      toast.success("Bank settings saved successfully");
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <AnimatedLogoLoader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Bank Transfer Settings
          </CardTitle>
          <CardDescription>
            Configure bank account details for user payments. These details will be shown to users when they upgrade their plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                placeholder="e.g. HBL, MCB, UBL"
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_title">Account Title *</Label>
              <Input
                id="account_title"
                placeholder="Account holder name"
                value={settings.account_title}
                onChange={(e) => setSettings({ ...settings, account_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                placeholder="Your account number"
                value={settings.account_number}
                onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                placeholder="International Bank Account Number"
                value={settings.iban}
                onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name</Label>
              <Input
                id="branch_name"
                placeholder="Bank branch name"
                value={settings.branch_name}
                onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone / WhatsApp Number
              </Label>
              <Input
                id="phone_number"
                placeholder="e.g. 0300-1234567"
                value={settings.phone_number}
                onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Instructions for Users
            </Label>
            <Textarea
              id="instructions"
              placeholder="Instructions that will be shown to users..."
              rows={4}
              value={settings.instructions}
              onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminBankSettings;
