import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, PartyPopper, Calendar, Clock, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Confetti from "./Confetti";

interface SubscriptionActivatedPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
  billingCycle?: string;
  activationDate?: string;
  endDate?: string;
}

const SubscriptionActivatedPopup = ({
  open,
  onOpenChange,
  planName = "Premium",
  billingCycle = "Monthly",
  activationDate,
  endDate,
}: SubscriptionActivatedPopupProps) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate("/dashboard");
  };

  const handleViewPlanDetails = () => {
    onOpenChange(false);
    navigate("/settings");
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0">
          {/* Animated Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-6 pb-12 text-center"
          >
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-white/30"
                  initial={{ 
                    x: Math.random() * 100 + "%", 
                    y: "100%",
                    scale: Math.random() * 0.5 + 0.5
                  }}
                  animate={{ 
                    y: "-100%",
                    x: `${Math.random() * 100}%`
                  }}
                  transition={{ 
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative inline-flex"
            >
              <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <PartyPopper className="h-10 w-10 text-white" />
                </motion.div>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-amber-300 flex items-center justify-center shadow-lg"
              >
                <Crown className="h-4 w-4 text-amber-800" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mt-4"
            >
              Subscription Activated! 🎉
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/80 text-sm mt-1"
            >
              Welcome to the premium experience
            </motion.p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 pt-0 -mt-6 relative z-10"
          >
            {/* Plan Card */}
            <div className="bg-white rounded-2xl shadow-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{planName}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {billingCycle}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <Calendar className="h-3 w-3" />
                    Activated On
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {activationDate
                      ? format(new Date(activationDate), "MMM d, yyyy")
                      : format(new Date(), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                    <Clock className="h-3 w-3" />
                    Valid Until
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {endDate
                      ? format(new Date(endDate), "MMM d, yyyy")
                      : "Lifetime"}
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleGoToDashboard}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleViewPlanDetails}
                  className="flex-1"
                >
                  View Plan Details
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionActivatedPopup;