import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

interface SuperAdminRouteProps {
  children: ReactNode;
}

const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const auth = localStorage.getItem("superAdminAuth");
    setIsAuthenticated(auth === "true");
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <AnimatedLogoLoader size="md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
