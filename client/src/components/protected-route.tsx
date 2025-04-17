import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./providers/auth-provider";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to login if not authenticated and loading has finished
    if (!isAuthenticated && !isLoading) {
      setLocation("/login");
      return;
    }
    
    // If admin role is required, check if the user is an admin
    if (requireAdmin && !isLoading && isAuthenticated) {
      if (user?.role !== 'admin') {
        // Redirect to dashboard if the user is not an admin
        setLocation("/");
      }
    }
  }, [isAuthenticated, isLoading, requireAdmin, user, setLocation]);

  // Show nothing while checking authentication or redirect is happening
  if (isLoading || !isAuthenticated) {
    return null;
  }
  
  // Show nothing if admin is required but user is not an admin
  if (requireAdmin && user?.role !== 'admin') {
    return null;
  }

  // Render children if authenticated and passes role check
  return <>{children}</>;
};