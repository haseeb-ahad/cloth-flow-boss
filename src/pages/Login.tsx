import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import dashboardPreview from "@/assets/dashboard-preview.jpeg";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const slideImages = [
  dashboardPreview,
  dashboardPreview,
  dashboardPreview,
];

export default function Login() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const showcaseRef = useRef<HTMLDivElement>(null);

  // Parallax mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animations for parallax
  const springConfig = { stiffness: 100, damping: 30 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Transform values for different parallax layers
  const textX = useTransform(smoothMouseX, [-0.5, 0.5], [15, -15]);
  const textY = useTransform(smoothMouseY, [-0.5, 0.5], [10, -10]);
  
  const imageX = useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]);
  const imageY = useTransform(smoothMouseY, [-0.5, 0.5], [-15, 15]);
  const imageRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [5, -5]);
  const imageRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-5, 5]);
  
  const glowX = useTransform(smoothMouseX, [-0.5, 0.5], [30, -30]);
  const glowY = useTransform(smoothMouseY, [-0.5, 0.5], [20, -20]);

  const brandX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return;
    const rect = showcaseRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Force light mode on login page
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
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(formData);
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
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
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
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
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
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 bg-white">
        <motion.div 
          className="w-full max-w-md mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div className="mb-10" variants={itemVariants}>
            <h1 className="text-4xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to manage your business system</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email or phone
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email or phone number"
                  className="pl-12 h-12 border-border/50 bg-background focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.email}
                </motion.p>
              )}
            </motion.div>

            {/* Password Field */}
            <motion.div className="space-y-2" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Link 
                  to="/reset-password" 
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-12 pr-12 h-12 border-border/50 bg-background focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive"
                >
                  {errors.password}
                </motion.p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </motion.div>
          </form>

          {/* Signup Link */}
          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link 
                to="/signup" 
                className="text-primary hover:text-primary/80 font-semibold underline underline-offset-4 transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Side - Showcase with Parallax */}
      <div 
        ref={showcaseRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70"
        style={{ perspective: 1000 }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-orange-500/80" />

        {/* Floating Glow Orbs with Parallax */}
        <motion.div 
          className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          style={{ x: glowX, y: glowY }}
        />
        <motion.div 
          className="absolute bottom-40 left-10 w-48 h-48 bg-orange-300/20 rounded-full blur-2xl"
          style={{ x: useTransform(glowX, v => -v * 0.7), y: useTransform(glowY, v => -v * 0.7) }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full">
          {/* Text Content with Parallax */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ x: textX, y: textY }}
          >
            <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
              All-in-One Business<br />Management Platform
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              <span className="font-semibold">Simplify your daily operations and grow your business</span>
              {" "}— Easily manage inventory, billing, expenses, sales, and analytics — everything you need to run your business smoothly in one smart system.
            </p>
          </motion.div>

          {/* Dashboard Preview Slider with 3D Parallax */}
          <motion.div 
            className="relative"
            style={{ 
              x: imageX, 
              y: imageY,
              rotateX: imageRotateX,
              rotateY: imageRotateY,
              transformStyle: "preserve-3d",
            }}
          >
            <motion.div 
              className="absolute -inset-4 bg-white/10 rounded-3xl blur-xl"
              animate={{ 
                scale: [1, 1.02, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentSlide}
                  src={slideImages[currentSlide]}
                  alt="Dashboard Preview"
                  className="w-full h-auto"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </AnimatePresence>
            </div>

            {/* Slide Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {slideImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === index 
                      ? "w-8 bg-white" 
                      : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Floating Brand Text with Parallax */}
          <motion.div 
            className="absolute bottom-8 left-0 right-0 overflow-hidden"
            style={{ x: brandX }}
          >
            <motion.div 
              className="flex items-center gap-8 whitespace-nowrap opacity-30"
              animate={{ x: [0, -200] }}
              transition={{ 
                duration: 10, 
                repeat: Infinity, 
                ease: "linear",
              }}
            >
              <span className="text-4xl font-bold text-white">Invoxa</span>
              <span className="text-4xl font-bold text-white/60">Invoxa</span>
              <span className="text-4xl font-bold text-white">Invoxa</span>
              <span className="text-4xl font-bold text-white/60">Invoxa</span>
              <span className="text-4xl font-bold text-white">Invoxa</span>
              <span className="text-4xl font-bold text-white/60">Invoxa</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
