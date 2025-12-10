import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: "admin" | "worker" | null;
  permissions: WorkerPermission[];
  loading: boolean;
  ownerId: string | null; // The admin_id for workers, or user_id for admins
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "worker" | null>(null);
  const [permissions, setPermissions] = useState<WorkerPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
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
      } else if (roleData?.role === "worker") {
        setOwnerId(roleData.admin_id || userId);
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
    // Admins have all permissions
    if (userRole === "admin") return true;

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
    if (userRole === "admin") return "/";
    
    // For workers, find the first feature they have view permission for
    const featureRouteMap: Record<string, string> = {
      invoice: "/invoice",
      inventory: "/inventory",
      sales: "/sales",
      credits: "/credits",
      customers: "/customers",
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
        loading,
        ownerId,
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
