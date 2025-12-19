import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Eye, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

const SuperAdminLoaderSettings = () => {
  const [loaderText, setLoaderText] = useState("INVOICE");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_loader_settings" },
      });

      if (error) throw error;
      if (data?.loader_text) {
        setLoaderText(data.loader_text);
      }
    } catch (error) {
      console.error("Error fetching loader settings:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!loaderText.trim()) {
      toast.error("Loader text cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke("super-admin", {
        body: { action: "update_loader_settings", data: { loader_text: loaderText.toUpperCase() } },
      });

      if (error) throw error;
      toast.success("Loader settings saved successfully");
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
            <Type className="w-5 h-5 text-blue-500" />
            Loader Logo Settings
          </CardTitle>
          <CardDescription>
            Customize the animated logo text that appears during loading states across the entire application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="loader_text">Loader Text</Label>
            <Input
              id="loader_text"
              placeholder="e.g. INVOICE, BUSINESS, SHOP"
              value={loaderText}
              onChange={(e) => setLoaderText(e.target.value.toUpperCase())}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Maximum 20 characters. Text will be displayed in uppercase.
            </p>
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </Label>
            <div className="border rounded-xl p-8 bg-slate-50 flex items-center justify-center min-h-[150px]">
              <AnimatedLogoLoader text={loaderText} size="lg" />
            </div>
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

export default SuperAdminLoaderSettings;
