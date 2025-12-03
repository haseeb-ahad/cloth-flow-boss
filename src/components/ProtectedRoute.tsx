import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  feature?: string;
  requirePermission?: "view" | "create" | "edit" | "delete";
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, feature, requirePermission, adminOnly }: ProtectedRouteProps) => {
  const { user, loading, hasPermission, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin-only routes
  if (adminOnly && userRole !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  // Check feature permission if required
  if (feature && requirePermission && !hasPermission(feature, requirePermission)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this feature.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
