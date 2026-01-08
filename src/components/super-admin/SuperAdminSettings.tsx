import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, Save, Bell, Copy, CheckCircle2, Loader2, RefreshCw, Zap, Shield } from "lucide-react";
import AutoApprovalAuditLog from "./AutoApprovalAuditLog";

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

  // Auto-approve settings
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [isLoadingAutoApprove, setIsLoadingAutoApprove] = useState(true);
  const [isSavingAutoApprove, setIsSavingAutoApprove] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("superAdminUserId");
    if (storedId) {
      setSuperAdminUserId(storedId);
    }
    fetchNotificationSettings();
    fetchAutoApproveSetting();
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

  const fetchAutoApproveSetting = async () => {
    setIsLoadingAutoApprove(true);
    try {
      const { data } = await supabase.functions.invoke("super-admin", {
        body: { action: "get_auto_approve_setting" },
      });
      setAutoApproveEnabled(data?.enabled || false);
    } catch (error) {
      console.error("Error fetching auto-approve setting:", error);
    }
    setIsLoadingAutoApprove(false);
  };

  const handleAutoApproveToggle = async (enabled: boolean) => {
    setIsSavingAutoApprove(true);
    try {
      await supabase.functions.invoke("super-admin", {
        body: { action: "set_auto_approve_setting", data: { enabled } },
      });
      setAutoApproveEnabled(enabled);
      toast.success(enabled ? "Auto-approval enabled" : "Auto-approval disabled");
    } catch (error) {
      console.error("Error updating auto-approve setting:", error);
      toast.error("Failed to update setting");
    }
    setIsSavingAutoApprove(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

      {/* Auto-Approve Settings */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            Auto-Approval Settings
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Automatically approve trusted payments that meet all security conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Enable Auto-Approve</p>
                <p className="text-xs text-slate-500 mt-1">
                  Payments will be auto-approved only if ALL conditions are met:
                </p>
                <ul className="text-xs text-slate-500 mt-2 space-y-1 list-disc list-inside">
                  <li>Unique payment screenshot (SHA-256 hash)</li>
                  <li>Unique transaction/reference ID</li>
                  <li>Amount exactly matches plan price</li>
                  <li>No duplicate approved payments for same user</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSavingAutoApprove && (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              )}
              <Switch
                checked={autoApproveEnabled}
                onCheckedChange={handleAutoApproveToggle}
                disabled={isLoadingAutoApprove || isSavingAutoApprove}
              />
            </div>
          </div>

          {autoApproveEnabled && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Auto-approval is <strong>enabled</strong>. Trusted payments will be approved instantly.
              </p>
            </div>
          )}

          {!autoApproveEnabled && !isLoadingAutoApprove && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-600">
                Auto-approval is <strong>disabled</strong>. All payments require manual review.
              </p>
            </div>
          )}
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

      {/* Auto-Approval Audit Log */}
      <AutoApprovalAuditLog />
    </div>
  );
};

export default SuperAdminSettings;