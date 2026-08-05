import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Phone, User, Eye, EyeOff, Store, ArrowRight } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import PasswordValidator, { usePasswordValidation } from "@/components/auth/PasswordValidator";
import { AuthShell } from "@/components/auth/AuthShell";



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

const slideImages = [
  dashboardPreview,
  dashboardPreview,
  dashboardPreview,
];

export default function Signup() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

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

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 4000);
    return () => clearInterval(interval);
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
            role: "admin",
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (signUpData.user) {
        await supabase.from("store_info").upsert({
          admin_id: signUpData.user.id,
          store_name: formData.storeName,
        });
      }

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const slideVariants = {
    enter: { opacity: 0, scale: 1.1, x: 100 },
    center: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.9, x: -100 },
  };

  return (
    <AuthShell
      wide
      badge="Start free"
      title="Create your admin account"
      subtitle="Set up your store and run billing, stock and credits in minutes."
      footer={
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Login
          </Link>
        </span>
      }
    >
      <motion.form
        onSubmit={handleSignup}
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div className="space-y-1.5" variants={itemVariants}>
            <Label htmlFor="storeName" className="text-sm font-medium text-foreground">
              Store Name
            </Label>
            <div className="relative">
              <Store className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="storeName"
                type="text"
                placeholder="Your store name"
                className="h-11 rounded-xl border-border/70 bg-background/40 pl-11 transition-all duration-300 focus:border-primary"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                disabled={loading}
              />
            </div>
            {errors.storeName && <p className="text-xs text-destructive">{errors.storeName}</p>}
          </motion.div>

          <motion.div className="space-y-1.5" variants={itemVariants}>
            <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Full Name
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Your full name"
                className="h-11 rounded-xl border-border/70 bg-background/40 pl-11 transition-all duration-300 focus:border-primary"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                disabled={loading}
              />
            </div>
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </motion.div>

          <motion.div className="space-y-1.5" variants={itemVariants}>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className="h-11 rounded-xl border-border/70 bg-background/40 pl-11 transition-all duration-300 focus:border-primary"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </motion.div>

          <motion.div className="space-y-1.5" variants={itemVariants}>
            <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="03xx xxxxxxx"
                className="h-11 rounded-xl border-border/70 bg-background/40 pl-11 transition-all duration-300 focus:border-primary"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={loading}
              />
            </div>
            {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
          </motion.div>

          <motion.div className="space-y-1.5" variants={itemVariants}>
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="h-11 rounded-xl border-border/70 bg-background/40 pl-11 pr-11 transition-all duration-300 focus:border-primary"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>

          <motion.div className="space-y-1.5" variants={itemVariants}>
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat password"
                className="h-11 rounded-xl border-border/70 bg-background/40 pl-11 pr-11 transition-all duration-300 focus:border-primary"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <PasswordValidator
            password={formData.password}
            confirmPassword={formData.confirmPassword}
            email={formData.email}
            showStrengthMeter
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-primary to-accent text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40"
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.form>
    </AuthShell>
  );
}

