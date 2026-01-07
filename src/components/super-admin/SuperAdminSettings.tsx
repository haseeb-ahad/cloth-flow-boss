import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, Save, Bell, Copy, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

// Default super admin password (same as in SuperAdminLogin.tsx)
const DEFAULT_SUPER_ADMIN_PASSWORD = "admin@super123978cv";

const getSuperAdminPassword = () => {
  return localStorage.getItem("superAdminPassword") || DEFAULT_SUPER_ADMIN_PASSWORD;
};

const SuperAdminSettings = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification settings
  const [superAdminUserId, setSuperAdminUserId] = useState("");
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("superAdminUserId");
    if (storedId) {
      setSuperAdminUserId(storedId);
    }
    fetchNotificationSettings();
  }, []);

  const generateSuperAdminId = async () => {
    const newId = crypto.randomUUID();
    localStorage.setItem("superAdminUserId", newId);
    setSuperAdminUserId(newId);
    
    // Auto-save to database via edge function
    try {
      await supabase.functions.invoke("super-admin", {
        body: { action: "save_super_admin_id", data: { super_admin_id: newId } }
      });
      toast.success("Super Admin ID generated and saved!");
    } catch (error) {
      console.error("Error saving ID:", error);
      toast.success("Super Admin ID generated!");
    }
  };

  const fetchNotificationSettings = async () => {
    // Just for display
  };

  const saveNotificationSettings = async () => {
    if (!superAdminUserId) {
      toast.error("No Super Admin ID found");
      return;
    }

    setIsSavingNotifications(true);
    try {
      await supabase.functions.invoke("super-admin", {
        body: { action: "save_super_admin_id", data: { super_admin_id: superAdminUserId } }
      });
      toast.success("Notifications enabled! You will now receive alerts.");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Failed to save notification settings");
    }
    setIsSavingNotifications(false);
  };


  const copyToClipboard = () => {
    navigator.clipboard.writeText(superAdminUserId);
    setCopied(true);
    toast.success("ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    // Get stored credentials (or use default)
    const storedPassword = getSuperAdminPassword();
    
    if (oldPassword !== storedPassword) {
      toast.error("Old password is incorrect");
      return;
    }

    if (oldPassword === newPassword) {
      toast.error("New password must be different from old password");
      return;
    }

    setIsLoading(true);
    try {
      // Update password in localStorage
      localStorage.setItem("superAdminPassword", newPassword);
      
      toast.success("Password changed successfully!");
      
      // Clear form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notification Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Notification Settings
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Enable notifications to receive alerts about admin activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="superAdminId" className="text-sm">Your Super Admin ID</Label>
            <div className="flex gap-2">
              <Input
                id="superAdminId"
                value={superAdminUserId}
                readOnly
                placeholder="Click 'Generate ID' to create"
                className="font-mono text-[10px] sm:text-xs bg-slate-50 h-9"
              />
              {superAdminUserId ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0 h-9 w-9"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={generateSuperAdminId}
                  className="shrink-0 h-9 text-sm"
                >
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Generate ID</span>
                </Button>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500">
              This ID is used to send you notifications about admin registrations, payments, and alerts.
            </p>
          </div>

          <Button
            onClick={saveNotificationSettings}
            disabled={isSavingNotifications || !superAdminUserId}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 h-9 sm:h-10 text-sm"
          >
            {isSavingNotifications ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Old Password */}
          <div className="space-y-2">
            <Label htmlFor="oldPassword" className="text-sm">Old Password</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter old password"
                className="pr-10 h-9 sm:h-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOldPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10 h-9 sm:h-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10 h-9 sm:h-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 h-9 sm:h-10 text-sm"
          >
            {isLoading ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Change Password
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminSettings;