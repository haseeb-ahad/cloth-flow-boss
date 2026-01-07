import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, Shield } from "lucide-react";
import PasswordValidator, { usePasswordValidation } from "@/components/auth/PasswordValidator";

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export default function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password validation
  const passwordValidation = usePasswordValidation(
    newPassword,
    confirmPassword,
    { email: user?.email || undefined }
  );

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return (
      currentPassword.length >= 1 &&
      passwordValidation.isValid &&
      newPassword !== currentPassword
    );
  }, [currentPassword, passwordValidation.isValid, newPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passwordValidation.isValid) {
      setError("Password does not meet security requirements");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("change-password", {
        body: {
          currentPassword: currentPassword,
          newPassword: newPassword.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      
      // Sign out after successful password change
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, 2000);

      onSuccess?.();
    } catch (error: any) {
      console.error("Change password error:", error);
      setError(error.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-6">
        <div className="space-y-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold text-foreground">Password Updated!</h3>
          <p className="text-sm text-muted-foreground">
            Your password has been successfully updated. You will be logged out from all devices for security.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
          <p className="text-sm text-muted-foreground">Update your password securely</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Enter current password"
              className="pl-10 pr-10"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password"
              className="pl-10 pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmNewPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              className="pl-10 pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Password Validator */}
        <PasswordValidator
          password={newPassword}
          confirmPassword={confirmPassword}
          email={user?.email || undefined}
          showStrengthMeter
        />

        {/* Same password warning */}
        {newPassword && currentPassword && newPassword === currentPassword && (
          <div className="text-sm text-warning bg-warning/10 p-3 rounded-lg">
            New password must be different from current password
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing Password...
            </>
          ) : (
            "Change Password"
          )}
        </Button>
      </form>
    </Card>
  );
}