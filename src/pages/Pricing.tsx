import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Zap, Crown, Star } from "lucide-react";
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

  const getPlanColor = (index: number) => {
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-pink-500",
      "from-amber-500 to-orange-500"
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-orange-200/30 rounded-full blur-3xl"
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-50 px-6 py-4 lg:px-12"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2">
              <img src={invoxaLogo} alt="Invoxa Logo" className="h-10 w-auto" />
            </motion.div>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/#features" className="text-slate-600 hover:text-slate-900 transition-colors font-semibold">Features</Link>
            <Link to="/#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors font-semibold">Testimonials</Link>
            <Link to="/pricing" className="text-blue-600 font-semibold">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-700 hover:text-slate-900">Login</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm font-medium mb-4">
              <Crown className="w-4 h-4" />
              Simple Pricing
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Choose Your
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Perfect Plan</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Start with a free trial and upgrade when you're ready. All plans include full access to core features.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-8 border border-slate-200">
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
                const colorGradient = getPlanColor(index);
                const featureList = getFeatureList(plan.features);
                const isPopular = index === 1;
                const { price, period } = getPlanPrice(plan);
                const durationLabel = getDurationLabel(plan);

                return (
                  <motion.div
                    key={plan.id}
                    variants={fadeInUp}
                    whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
                    className={`relative bg-white rounded-2xl p-8 border ${isPopular ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'} shadow-sm transition-all duration-300`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorGradient} flex items-center justify-center mb-5 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-slate-500 text-sm mb-4">{plan.description || "Perfect for growing businesses"}</p>
                    
                    <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-4">
                      {durationLabel}
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-slate-900">
                          PKR {price.toLocaleString()}
                        </span>
                        {period !== 'lifetime' && (
                          <span className="text-slate-500">/{period}</span>
                        )}
                      </div>
                      {plan.trial_days != null && plan.trial_days > 0 && (
                        <p className="text-sm text-blue-600 mt-1">
                          {plan.trial_days} days free trial included
                        </p>
                      )}
                    </div>

                    <Link to="/signup" className="block mb-6">
                      <Button
                        className={`w-full ${isPopular 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                        size="lg"
                      >
                        Get Started
                      </Button>
                    </Link>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-700">What's included:</p>
                      {featureList.map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${colorGradient} flex items-center justify-center flex-shrink-0`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {plan.is_lifetime && (
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
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
            <p className="text-slate-600 mb-4">Need a custom plan for your enterprise?</p>
            <Link to="/signup">
              <Button variant="outline" size="lg" className="border-2">
                Contact Sales
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 lg:px-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-500">© 2024 Invoxa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
