import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: "admin" | "worker" | null;
  permissions: WorkerPermission[];
  adminFeatureOverrides: AdminFeatureOverride[];
  loading: boolean;
  ownerId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  signOut: () => Promise<void>;
  hasPermission: (feature: string, action: "view" | "create" | "edit" | "delete") => boolean;
  getFirstPermittedRoute: () => string;
}

interface WorkerPermission {
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface AdminFeatureOverride {
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface SubscriptionStatus {
  status: string;
  is_trial: boolean;
  end_date: string | null;
  is_expired: boolean;
  days_remaining: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "worker" | null>(null);
  const [permissions, setPermissions] = useState<WorkerPermission[]>([]);
  const [adminFeatureOverrides, setAdminFeatureOverrides] = useState<AdminFeatureOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role and permissions after state is set
          setTimeout(() => {
            fetchUserRoleAndPermissions(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setPermissions([]);
          setAdminFeatureOverrides([]);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoleAndPermissions(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoleAndPermissions = async (userId: string) => {
    try {
      // Fetch user role and admin_id
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, admin_id")
        .eq("user_id", userId)
        .single();

      if (roleError) throw roleError;
      setUserRole(roleData?.role || null);
      
      // Set owner_id: for admins it's their own id, for workers it's their admin_id
      if (roleData?.role === "admin") {
        setOwnerId(userId);
        
        // Fetch admin subscription status
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, is_trial, end_date")
          .eq("admin_id", userId)
          .single();
        
        if (subData) {
          const endDate = subData.end_date ? new Date(subData.end_date) : null;
          const isExpired = endDate ? endDate < new Date() : false;
          const daysRemaining = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          
          setSubscriptionStatus({
            status: isExpired && subData.status !== "free" ? "expired" : subData.status,
            is_trial: subData.is_trial || false,
            end_date: subData.end_date,
            is_expired: isExpired && subData.status !== "free",
            days_remaining: daysRemaining,
          });
        } else {
          setSubscriptionStatus(null);
        }
        
        // Fetch admin feature overrides set by super admin
        const { data: overridesData, error: overridesError } = await supabase
          .from("admin_feature_overrides")
          .select("*")
          .eq("admin_id", userId);
        
        if (!overridesError && overridesData) {
          setAdminFeatureOverrides(overridesData.map(o => ({
            feature: o.feature,
            can_view: o.can_view || false,
            can_create: o.can_create || false,
            can_edit: o.can_edit || false,
            can_delete: o.can_delete || false,
          })));
        }
      } else if (roleData?.role === "worker") {
        setOwnerId(roleData.admin_id || userId);
        setSubscriptionStatus(null);
      }

      // Fetch permissions if worker
      if (roleData?.role === "worker") {
        const { data: permData, error: permError } = await supabase
          .from("worker_permissions")
          .select("*")
          .eq("worker_id", userId);

        if (permError) throw permError;
        setPermissions(permData || []);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error("Error fetching user role and permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setPermissions([]);
    setOwnerId(null);
    navigate("/login");
  };

  const hasPermission = (feature: string, action: "view" | "create" | "edit" | "delete"): boolean => {
    // For admins, check subscription status first
    if (userRole === "admin") {
      // If subscription is expired, block all access
      if (subscriptionStatus?.is_expired) {
        return false;
      }
      
      // If there are feature overrides from super admin, use them
      if (adminFeatureOverrides.length > 0) {
        const override = adminFeatureOverrides.find(o => o.feature === feature);
        if (override) {
          switch (action) {
            case "view": return override.can_view;
            case "create": return override.can_create;
            case "edit": return override.can_edit;
            case "delete": return override.can_delete;
            default: return false;
          }
        }
        // If feature not in overrides, default to false
        return false;
      }
      // No overrides set, admin has full access
      return true;
    }

    // Check worker permissions
    const perm = permissions.find(p => p.feature === feature);
    if (!perm) return false;

    switch (action) {
      case "view": return perm.can_view;
      case "create": return perm.can_create;
      case "edit": return perm.can_edit;
      case "delete": return perm.can_delete;
      default: return false;
    }
  };

  const getFirstPermittedRoute = (): string => {
    // Admins go to dashboard
    if (userRole === "admin") return "/dashboard";
    
    // For workers, find the first feature they have view permission for
    const featureRouteMap: Record<string, string> = {
      invoice: "/invoice",
      inventory: "/inventory",
      sales: "/sales",
      credits: "/credits",
      customers: "/customers",
      expenses: "/expenses",
      receive_payment: "/receive-payment",
    };
    
    const firstPermittedFeature = permissions.find(p => p.can_view);
    if (firstPermittedFeature) {
      return featureRouteMap[firstPermittedFeature.feature] || "/settings";
    }
    
    // Default to settings if no permissions
    return "/settings";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        permissions,
        adminFeatureOverrides,
        loading,
        ownerId,
        subscriptionStatus,
        signOut,
        hasPermission,
        getFirstPermittedRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
