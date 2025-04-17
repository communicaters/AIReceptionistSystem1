import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./providers/auth-provider";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to login if not authenticated and loading has finished
    if (!isAuthenticated && !isLoading) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Show nothing while checking authentication or redirect is happening
  if (isLoading || !isAuthenticated) {
    return null;
  }

  // Render children if authenticated
  return <>{children}</>;
};