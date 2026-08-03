import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Zap, Crown, Star } from "lucide-react";
import { useTheme } from "next-themes";
import invoxaLogo from "@/assets/invoxa-logo.png";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  daily_price: number;
  lifetime_price: number;
  duration_months: number;
  is_lifetime: boolean | null;
  features: Record<string, { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }>;
  trial_days: number | null;
}

const getPlanPrice = (plan: Plan) => {
  if (plan.is_lifetime) {
    return { price: plan.lifetime_price, period: 'lifetime' };
  }
  
  const months = plan.duration_months;
  
  // Check for yearly (12 months or more)
  if (months >= 12 && plan.yearly_price > 0) {
    return { price: plan.yearly_price, period: 'year' };
  }
  
  // Check for monthly
  if (months >= 1 && plan.monthly_price > 0) {
    return { price: plan.monthly_price, period: 'month' };
  }
  
  // Check for daily
  if (plan.daily_price > 0) {
    return { price: plan.daily_price, period: 'day' };
  }
  
  // Fallback to monthly
  return { price: plan.monthly_price, period: 'month' };
};

const getDurationLabel = (plan: Plan) => {
  if (plan.is_lifetime) return 'Lifetime';
  const months = plan.duration_months;
  if (months >= 12) {
    const years = Math.floor(months / 12);
    return years === 1 ? '1 Year' : `${years} Years`;
  }
  return months === 1 ? '1 Month' : `${months} Months`;
};

const Pricing = () => {
  const { setTheme, theme } = useTheme();

  // Force light mode on pricing page
  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    
    return () => {
      // Restore previous theme when leaving the page
      if (previousTheme && previousTheme !== "light") {
        setTheme(previousTheme);
      }
    };
  }, []);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['active-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });
      
      if (error) throw error;
      return data as Plan[];
    }
  });

  const getFeatureList = (features: Plan['features']) => {
    const featureNames: Record<string, string> = {
      sales: "Sales Management",
      staff: "Staff Management", 
      credits: "Credit Tracking",
      invoice: "Invoice Generation",
      reports: "Reports & Analytics",
      customers: "Customer Management",
      inventory: "Inventory Control"
    };

    return Object.entries(features)
      .filter(([_, perms]) => perms.view)
      .map(([key]) => featureNames[key] || key);
  };

  const getPlanIcon = (index: number) => {
    const icons = [Zap, Star, Crown];
    return icons[index % icons.length];
  };

  return (
    <div className="landing-midnight min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="grid-lines absolute inset-0 opacity-60" />
        <motion.div
          animate={{ x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, -60, 0], y: [0, 60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-secondary/60 blur-[140px]"
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-50 px-6 py-4 lg:px-12"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-border/70 bg-card/50 px-4 py-3 backdrop-blur-xl">
          <Link to="/">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2">
              <img src={invoxaLogo} alt="Invoxa Logo" className="h-11 w-auto" />
            </motion.div>
          </Link>

          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
            <Link to="/#testimonials" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Testimonials</Link>
            <Link to="/pricing" className="text-sm font-semibold text-primary">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-foreground hover:bg-secondary/60">Login</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary text-primary-foreground shadow-glow hover:bg-primary/90">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Pricing Section */}
      <section className="relative z-10 px-6 py-20 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-muted-foreground">
              <Crown className="h-4 w-4 text-primary" />
              Simple Pricing
            </div>
            <h1 className="mb-4 text-4xl font-bold text-foreground lg:text-6xl">
              Choose your <span className="gradient-text">perfect plan</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Start with a free trial and upgrade when you're ready. All plans include full access to core features.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bento-card p-8">
                  <Skeleton className="h-12 w-12 rounded-xl mb-4" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-6" />
                  <Skeleton className="h-12 w-24 mb-6" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {plans?.map((plan, index) => {
                const Icon = getPlanIcon(index);
                const featureList = getFeatureList(plan.features);
                const isPopular = index === 1;
                const { price, period } = getPlanPrice(plan);
                const durationLabel = getDurationLabel(plan);

                return (
                  <motion.div
                    key={plan.id}
                    variants={fadeInUp}
                    whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
                    className={`bento-card relative p-8 ${isPopular ? 'ring-2 ring-primary/60' : ''}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Icon className="h-7 w-7" />
                    </div>

                    <h3 className="mb-2 text-2xl font-bold text-foreground">{plan.name}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">{plan.description || "Perfect for growing businesses"}</p>
                    
                    <div className="mb-4 inline-block whitespace-nowrap rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {durationLabel}
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-4xl font-bold text-foreground">
                          PKR {price.toLocaleString()}
                        </span>
                        {period !== 'lifetime' && (
                          <span className="text-muted-foreground">/{period}</span>
                        )}
                      </div>
                      {plan.trial_days != null && plan.trial_days > 0 && (
                        <p className="mt-1 text-sm text-primary">
                          {plan.trial_days} days free trial included
                        </p>
                      )}
                    </div>

                    <Link to="/signup" className="block mb-6">
                      <Button
                        className={`w-full ${isPopular
                          ? 'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90'
                          : 'border border-border bg-secondary/50 text-foreground hover:bg-secondary'
                        }`}
                        size="lg"
                      >
                        Get Started
                      </Button>
                    </Link>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">What's included:</p>
                      {featureList.map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                            <Check className="h-3 w-3" />
                          </div>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {plan.is_lifetime && (
                      <div className="mt-6 border-t border-border pt-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                          <Crown className="w-4 h-4" />
                          Lifetime Access
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* FAQ or CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <p className="mb-4 text-muted-foreground">Need a custom plan for your enterprise?</p>
            <Link to="/signup">
              <Button variant="outline" size="lg" className="border-border bg-transparent text-foreground hover:bg-secondary/60">
                Contact Sales
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-muted-foreground">© 2026 Invoxa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
