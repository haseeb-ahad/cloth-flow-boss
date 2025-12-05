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
  const { user, loading, hasPermission, userRole, getFirstPermittedRoute } = useAuth();

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

  // Check admin-only routes - redirect workers to their first permitted route
  if (adminOnly && userRole !== "admin") {
    const redirectRoute = getFirstPermittedRoute();
    return <Navigate to={redirectRoute} replace />;
  }

  // Check feature permission if required - redirect to first permitted route
  if (feature && requirePermission && !hasPermission(feature, requirePermission)) {
    const redirectRoute = getFirstPermittedRoute();
    return <Navigate to={redirectRoute} replace />;
  }

  return <>{children}</>;
};
