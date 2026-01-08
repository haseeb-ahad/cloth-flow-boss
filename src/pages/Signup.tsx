import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Phone, User, Eye, EyeOff, Store } from "lucide-react";
import { z } from "zod";
import PasswordValidator, { usePasswordValidation } from "@/components/auth/PasswordValidator";
import dashboardPreview from "@/assets/dashboard-preview.jpeg";

// Strong password validation schema
const signupSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least 1 uppercase letter")
    .regex(/[a-z]/, "Password must include at least 1 lowercase letter")
    .regex(/[0-9]/, "Password must include at least 1 number")
    .regex(/[!@#$%^&*]/, "Password must include at least 1 special character (!@#$%^&*)"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Signup() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  // Force light mode on signup page
  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    
    return () => {
      if (previousTheme && previousTheme !== "light") {
        setTheme(previousTheme);
      }
    };
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    storeName: "",
    email: "",
    phoneNumber: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password validation hook
  const passwordValidation = usePasswordValidation(
    formData.password,
    formData.confirmPassword,
    { email: formData.email }
  );

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    return (
      formData.storeName.length >= 2 &&
      formData.email.includes("@") &&
      formData.phoneNumber.length >= 10 &&
      formData.fullName.length >= 2 &&
      passwordValidation.isValid
    );
  }, [formData, passwordValidation.isValid]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            phone_number: formData.phoneNumber,
            full_name: formData.fullName,
            store_name: formData.storeName,
            role: "admin", // Only admins can sign up through this form
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Save store info to database
      if (signUpData.user) {
        await supabase.from("store_info").upsert({
          admin_id: signUpData.user.id,
          store_name: formData.storeName,
        });
      }

      // Notify super admin about new registration
      if (signUpData.user) {
        try {
          await supabase.functions.invoke("super-admin", {
            body: {
              action: "notify_admin_registered",
              data: {
                admin_id: signUpData.user.id,
                admin_email: formData.email,
                admin_name: formData.fullName,
              },
            },
          });
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
          // Don't fail signup if notification fails
        }
      }

      toast.success("Account created successfully! Please login.");
      navigate("/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Admin Account</h1>
            <p className="text-muted-foreground">Sign up as an administrator</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Store Name Field */}
            <div className="space-y-1.5">
              <Label htmlFor="storeName" className="text-sm font-medium text-foreground">
                Store Name
              </Label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="storeName"
                  type="text"
                  placeholder="Enter your store name"
                  className="pl-11 h-11 border-border/50 bg-background focus:border-primary transition-colors"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.storeName && <p className="text-xs text-destructive">{errors.storeName}</p>}
            </div>

            {/* Full Name Field */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  className="pl-11 h-11 border-border/50 bg-background focus:border-primary transition-colors"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-11 h-11 border-border/50 bg-background focus:border-primary transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Phone Number Field */}
            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  className="pl-11 h-11 border-border/50 bg-background focus:border-primary transition-colors"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="pl-11 pr-11 h-11 border-border/50 bg-background focus:border-primary transition-colors"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="pl-11 pr-11 h-11 border-border/50 bg-background focus:border-primary transition-colors"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Validator Component */}
            <PasswordValidator
              password={formData.password}
              confirmPassword={formData.confirmPassword}
              email={formData.email}
              showStrengthMeter
            />

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 mt-2"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-primary hover:text-primary/80 font-semibold underline underline-offset-4 transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Showcase */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-orange-500/80" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full">
          {/* Text Content */}
          <div className="mb-8">
            <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
              All-in-One Business<br />Management Platform
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              <span className="font-semibold">Simplify your daily operations and grow your business</span>
              {" "}— Easily manage inventory, billing, expenses, sales, and analytics — everything you need to run your business smoothly in one smart system.
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-white/10 rounded-3xl blur-xl" />
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              <img 
                src={dashboardPreview} 
                alt="Dashboard Preview" 
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Floating Brand Text */}
          <div className="absolute bottom-8 left-0 right-0 overflow-hidden">
            <div className="flex items-center gap-8 animate-marquee whitespace-nowrap opacity-30">
              <span className="text-4xl font-bold text-white">Invoxa</span>
              <span className="text-4xl font-bold text-white/60">Invoxa</span>
              <span className="text-4xl font-bold text-white">Invoxa</span>
              <span className="text-4xl font-bold text-white/60">Invoxa</span>
              <span className="text-4xl font-bold text-white">Invoxa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
