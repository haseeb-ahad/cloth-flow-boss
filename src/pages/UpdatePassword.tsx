import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import PasswordValidator, { usePasswordValidation } from "@/components/auth/PasswordValidator";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  // Password validation
  const passwordValidation = usePasswordValidation(
    password,
    confirmPassword,
    { email: userEmail }
  );

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return passwordValidation.isValid && password.length >= 8;
  }, [passwordValidation.isValid, password]);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setSessionValid(true);
        setUserEmail(session.user.email || undefined);
      } else {
        // Listen for auth state changes (recovery token)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
              setSessionValid(true);
              setUserEmail(session?.user.email || undefined);
            }
          }
        );

        // Give it a moment to process the recovery token
        setTimeout(() => {
          if (sessionValid === null) {
            setSessionValid(false);
          }
        }, 2000);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password
    if (!passwordValidation.isValid) {
      setError("Password does not meet security requirements");
      return;
    }

    if (!passwordValidation.passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      setSuccess(true);
      
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Update password error:", error);
      setError(error.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (sessionValid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </Card>
      </div>
    );
  }

  // Show error if session is invalid
  if (sessionValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Invalid or Expired Link</h1>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Button onClick={() => navigate("/reset-password")} className="w-full">
            Request New Reset Link
          </Button>
          <div className="text-center">
            <Button variant="link" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="space-y-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-3xl font-bold text-foreground">Password Updated!</h1>
            <p className="text-muted-foreground">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-foreground">Set New Password</h1>
          <p className="text-muted-foreground">
            Create a strong password that meets our security requirements
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
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
            password={password}
            confirmPassword={confirmPassword}
            email={userEmail}
            showStrengthMeter
          />

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
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}