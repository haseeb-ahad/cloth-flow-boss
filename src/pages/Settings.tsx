import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone, TIMEZONES } from "@/contexts/TimezoneContext";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { Loader2, Upload, Settings as SettingsIcon, Globe, User, X, Receipt, Plus, Trash2, Clock } from "lucide-react";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

export default function Settings() {
  const { user, userRole, ownerId } = useAuth();
  const { timezone, setTimezone } = useTimezone();
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [appSettings, setAppSettings] = useState({
    app_name: "Business Manager",
    description: "",
    language: "en",
    logo_url: "",
    shop_name: "Your Shop Name",
    shop_address: "Your Shop Address Here",
    phone_numbers: ["+92-XXX-XXXXXXX"] as string[],
    owner_names: ["Owner Name"] as string[],
    thank_you_message: "Thank You!",
    footer_message: "Get Well Soon",
    worker_name: "",
    worker_phone: "",
  });
  const [profile, setProfile] = useState({
    full_name: "",
    phone_number: "",
    email: "",
  });

  useEffect(() => {
    if (ownerId) {
      loadSettings();
    }
    loadProfile();
  }, [user, ownerId]);

  const loadSettings = async () => {
    if (!user || !ownerId) return;
    try {
      // First try to get existing settings for this admin/team
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setAppSettings({
          app_name: data.app_name || "Business Manager",
          description: (data as any).description || "",
          language: data.language || "en",
          logo_url: data.logo_url || "",
          shop_name: data.shop_name || "Your Shop Name",
          shop_address: data.shop_address || "Your Shop Address Here",
          phone_numbers: data.phone_numbers || ["+92-XXX-XXXXXXX"],
          owner_names: (data as any).owner_names || ["Owner Name"],
          thank_you_message: data.thank_you_message || "Thank You!",
          footer_message: data.footer_message || "Get Well Soon",
          worker_name: (data as any).worker_name || "",
          worker_phone: (data as any).worker_phone || "",
        });
      } else if (userRole === "admin") {
        // Create default settings for new admin
        const { error: insertError } = await supabase
          .from("app_settings")
          .insert({
            owner_id: user.id,
            app_name: "Business Manager",
            shop_name: "Your Shop Name",
            shop_address: "Your Shop Address Here",
            phone_numbers: ["+92-XXX-XXXXXXX"],
            owner_names: ["Owner Name"],
            thank_you_message: "Thank You!",
            footer_message: "Get Well Soon",
            language: "en",
          });
        
        if (insertError) {
          console.error("Error creating settings:", insertError);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone_number: data.phone_number || "",
          email: data.email || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSaveGeneralSettings = async () => {
    if (userRole !== "admin" || !user || !ownerId) {
      toast.error("Only admins can update general settings");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({
          app_name: appSettings.app_name,
          description: appSettings.description,
          language: appSettings.language,
          shop_name: appSettings.shop_name,
          shop_address: appSettings.shop_address,
          phone_numbers: appSettings.phone_numbers,
          owner_names: appSettings.owner_names,
          thank_you_message: appSettings.thank_you_message,
          footer_message: appSettings.footer_message,
          worker_name: appSettings.worker_name,
          worker_phone: appSettings.worker_phone,
        } as any)
        .eq("owner_id", ownerId);

      if (error) throw error;
      toast.success("General settings updated successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole !== "admin" || !ownerId) {
      toast.error("Only admins can upload logo");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo size must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("payment-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("payment-images")
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Update app_settings with logo URL
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ logo_url: logoUrl })
        .eq("owner_id", ownerId);

      if (updateError) throw updateError;

      setAppSettings(prev => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (userRole !== "admin" || !user || !ownerId) {
      toast.error("Only admins can remove logo");
      return;
    }

    setUploadingLogo(true);
    try {
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ logo_url: null })
        .eq("owner_id", ownerId);

      if (updateError) throw updateError;

      setAppSettings(prev => ({ ...prev, logo_url: "" }));
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      toast.success("Logo removed successfully!");
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error(error.message || "Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-page mobile-section-gap">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message="Saving settings..." />
        </div>
      )}
      <div className="mobile-icon-text">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="w-full overflow-hidden">
        {/* Mobile-friendly tabs - scrollable horizontally if needed */}
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1">
          <TabsTrigger value="general" className="mobile-icon-text text-xs md:text-sm py-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="mobile-icon-text text-xs md:text-sm py-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Receipt</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="mobile-icon-text text-xs md:text-sm py-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Language</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="mobile-icon-text text-xs md:text-sm py-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mobile-section-gap mt-4">
          <Card className="mobile-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground text-left">General Settings</h2>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                value={appSettings.app_name}
                onChange={(e) => setAppSettings({ ...appSettings, app_name: e.target.value })}
                disabled={loading || userRole !== "admin"}
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="appDescription">Application Description</Label>
              <Input
                id="appDescription"
                value={appSettings.description}
                onChange={(e) => setAppSettings({ ...appSettings, description: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., Pro Suite"
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="logo">Upload Logo</Label>
              <div className="flex flex-col gap-4 items-start">
                {appSettings.logo_url ? (
                  <div className="relative inline-block w-fit">
                    <img 
                      src={appSettings.logo_url} 
                      alt="Business Logo" 
                      className="h-24 w-24 rounded-lg border border-border object-contain bg-white"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo || userRole !== "admin"}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <input
                      id="logo"
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo || userRole !== "admin"}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo || userRole !== "admin"}
                      className="h-24 w-24 border-dashed"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Recommended size: 200x200px (PNG or JPG). This logo will appear on printed invoices.
              </p>
            </div>

            <Button
              onClick={handleSaveGeneralSettings}
              disabled={loading || userRole !== "admin"}
              className="mobile-btn-full mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save General Settings"
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="mobile-section-gap mt-4">
          <Card className="mobile-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground text-left">Receipt Settings</h2>
            <p className="text-sm text-muted-foreground text-left mt-1">Configure how your printed receipts/invoices will appear</p>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                value={appSettings.shop_name}
                onChange={(e) => setAppSettings({ ...appSettings, shop_name: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., MJY Medical Pharmacy"
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="shopAddress">Shop Address</Label>
              <Input
                id="shopAddress"
                value={appSettings.shop_address}
                onChange={(e) => setAppSettings({ ...appSettings, shop_address: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., Your Shop Address Here"
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label>Owner Names</Label>
              <div className="flex flex-col gap-2 w-full">
                {appSettings.owner_names.map((name, index) => (
                  <div key={index} className="flex gap-2 w-full">
                    <Input
                      value={name}
                      onChange={(e) => {
                        const newNames = [...appSettings.owner_names];
                        newNames[index] = e.target.value;
                        setAppSettings({ ...appSettings, owner_names: newNames });
                      }}
                      disabled={loading || userRole !== "admin"}
                      placeholder="e.g., Ameer Hamza Sadiq"
                      className="flex-1"
                    />
                    {appSettings.owner_names.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          const newNames = appSettings.owner_names.filter((_, i) => i !== index);
                          setAppSettings({ ...appSettings, owner_names: newNames });
                        }}
                        disabled={loading || userRole !== "admin"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAppSettings({ ...appSettings, owner_names: [...appSettings.owner_names, ""] })}
                  disabled={loading || userRole !== "admin"}
                  className="mobile-btn-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Owner Name
                </Button>
              </div>
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="thankYouMessage">Thank You Message</Label>
              <Input
                id="thankYouMessage"
                value={appSettings.thank_you_message}
                onChange={(e) => setAppSettings({ ...appSettings, thank_you_message: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., Thank You!"
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="workerName">Worker Name (Shown on Receipt)</Label>
              <Input
                id="workerName"
                value={appSettings.worker_name}
                onChange={(e) => setAppSettings({ ...appSettings, worker_name: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., Muhammad Ali"
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="workerPhone">Worker Phone (Shown on Receipt)</Label>
              <Input
                id="workerPhone"
                value={appSettings.worker_phone}
                onChange={(e) => setAppSettings({ ...appSettings, worker_phone: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., 0300-1234567"
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="footerMessage">Footer Message</Label>
              <Input
                id="footerMessage"
                value={appSettings.footer_message}
                onChange={(e) => setAppSettings({ ...appSettings, footer_message: e.target.value })}
                disabled={loading || userRole !== "admin"}
                placeholder="e.g., Get Well Soon"
                className="w-full"
              />
            </div>

            <Button
              onClick={handleSaveGeneralSettings}
              disabled={loading || userRole !== "admin"}
              className="mobile-btn-full mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Receipt Settings"
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="mobile-section-gap mt-4">
          <Card className="mobile-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground text-left">Language & Timezone Settings</h2>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="language">{t("selectLanguage")}</Label>
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value);
                  toast.success(`Language changed to ${LANGUAGES.find(l => l.code === value)?.nativeName || value}`);
                }}
                disabled={loading || userRole !== "admin"}
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder={t("selectLanguage")} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="timezone" className="mobile-icon-text">
                <Clock className="h-4 w-4" />
                Select Timezone
              </Label>
              <Select
                value={timezone}
                onValueChange={(value) => {
                  setTimezone(value);
                  toast.success(`Timezone changed to ${TIMEZONES.find(tz => tz.value === value)?.label || value}`);
                }}
                disabled={loading || userRole !== "admin"}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground text-left">
                All dates and times in the application will be displayed in this timezone
              </p>
            </div>

            <Button
              onClick={handleSaveGeneralSettings}
              disabled={loading || userRole !== "admin"}
              className="mobile-btn-full mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mobile-section-gap mt-4">
          <Card className="mobile-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground text-left">Profile Settings</h2>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                disabled={loading}
                className="w-full"
              />
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted w-full"
              />
              <p className="text-sm text-muted-foreground text-left">Email cannot be changed</p>
            </div>

            <div className="mobile-form-field mt-4">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={profile.phone_number}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                disabled={loading}
                className="w-full"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={loading} className="mobile-btn-full mt-4">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
