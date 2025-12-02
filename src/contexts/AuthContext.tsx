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
  signOut: () => Promise<void>;
  hasPermission: (feature: string, action: "view" | "create" | "edit" | "delete") => boolean;
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
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleError) throw roleError;
      setUserRole(roleData?.role || null);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        permissions,
        loading,
        signOut,
        hasPermission,
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
