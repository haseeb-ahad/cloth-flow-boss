import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionData {
  planName: string;
  billingCycle: string;
  activationDate: string;
  endDate: string | null;
}

export const useSubscriptionNotification = () => {
  const { user } = useAuth();
  const [showActivationPopup, setShowActivationPopup] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for subscription activation notifications
    const channel = supabase
      .channel('subscription-activation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as any;
          if (notification.category === 'subscription_activated') {
            // Fetch subscription details
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("*, plans(*)")
              .eq("admin_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (subscription) {
              setSubscriptionData({
                planName: (subscription as any).plans?.name || "Premium",
                billingCycle: subscription.billing_cycle || "Monthly",
                activationDate: subscription.start_date,
                endDate: subscription.end_date,
              });
              setShowActivationPopup(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    showActivationPopup,
    setShowActivationPopup,
    subscriptionData,
  };
};

export default useSubscriptionNotification;