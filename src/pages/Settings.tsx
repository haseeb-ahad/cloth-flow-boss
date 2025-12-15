import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, Settings as SettingsIcon, Globe, User, X } from "lucide-react";

export default function Settings() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [appSettings, setAppSettings] = useState({
    app_name: "Business Manager",
    language: "en",
    logo_url: "",
  });
  const [profile, setProfile] = useState({
    full_name: "",
    phone_number: "",
    email: "",
  });

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        setAppSettings({
          app_name: data.app_name || "Business Manager",
          language: data.language || "en",
          logo_url: data.logo_url || "",
        });
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
    if (userRole !== "admin") {
      toast.error("Only admins can update general settings");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({
          app_name: appSettings.app_name,
          language: appSettings.language,
        })
        .eq("id", (await supabase.from("app_settings").select("id").single()).data?.id);

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
    if (userRole !== "admin") {
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
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("id")
        .single();

      if (settingsData) {
        const { error: updateError } = await supabase
          .from("app_settings")
          .update({ logo_url: logoUrl })
          .eq("id", settingsData.id);

        if (updateError) throw updateError;
      }

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
    if (userRole !== "admin") {
      toast.error("Only admins can remove logo");
      return;
    }

    setUploadingLogo(true);
    try {
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("id")
        .single();

      if (settingsData) {
        const { error: updateError } = await supabase
          .from("app_settings")
          .update({ logo_url: null })
          .eq("id", settingsData.id);

        if (updateError) throw updateError;
      }

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <SettingsIcon className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="language">
            <Globe className="mr-2 h-4 w-4" />
            Language
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">General Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                value={appSettings.app_name}
                onChange={(e) => setAppSettings({ ...appSettings, app_name: e.target.value })}
                disabled={loading || userRole !== "admin"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Upload Logo</Label>
              <div className="flex flex-col gap-4">
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
              <p className="text-sm text-muted-foreground">
                Recommended size: 200x200px (PNG or JPG). This logo will appear on printed invoices.
              </p>
            </div>

            <Button
              onClick={handleSaveGeneralSettings}
              disabled={loading || userRole !== "admin"}
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

        <TabsContent value="language" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Language Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="language">Select Language</Label>
              <Select
                value={appSettings.language}
                onValueChange={(value) => setAppSettings({ ...appSettings, language: value })}
                disabled={loading || userRole !== "admin"}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ur">Urdu (اردو)</SelectItem>
                  <SelectItem value="ar">Arabic (العربية)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveGeneralSettings}
              disabled={loading || userRole !== "admin"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Language Settings"
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Profile Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={profile.phone_number}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                disabled={loading}
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={loading}>
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
