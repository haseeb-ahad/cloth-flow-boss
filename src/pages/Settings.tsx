import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, Settings as SettingsIcon, Globe, User } from "lucide-react";

export default function Settings() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      // Upload to Supabase storage would go here
      // For now, we'll just show a placeholder
      toast.info("Logo upload feature will be implemented with storage bucket");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setLoading(false);
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
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={loading || userRole !== "admin"}
                  className="max-w-xs"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Recommended size: 200x200px (PNG or JPG)
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
