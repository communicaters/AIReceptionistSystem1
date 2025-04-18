import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if we have a token and user data in localStorage on initial load
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      const userInfo = localStorage.getItem("userInfo");

      if (token && userInfo) {
        try {
          const userData = JSON.parse(userInfo);
          setUser(userData);
          setIsAuthenticated(true);
          setIsLoading(false);
        } catch (error) {
          console.error("Error parsing user data:", error);
          // Clear invalid data
          localStorage.removeItem("authToken");
          localStorage.removeItem("userInfo");
          
          // Auto-login functionality for development
          await autoLoginForDevelopment();
        }
      } else {
        // Auto-login functionality for development
        await autoLoginForDevelopment();
      }
    };

    // Auto-login function with development endpoint for testing only
    const autoLoginForDevelopment = async () => {
      try {
        console.log("Attempting auto-login with dev endpoint...");
        
        // Use the dev-login endpoint that doesn't require password verification
        const response = await fetch("/api/auth/dev-login", {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        const data = await response.json();
        
        if (response.ok && data.token && data.user) {
          console.log("Auto-login successful");
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("userInfo", JSON.stringify(data.user));
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          console.error("Auto-login failed:", data.message);
        }
      } catch (error) {
        console.error("Auto-login error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    // Store auth data in localStorage
    localStorage.setItem("authToken", token);
    localStorage.setItem("userInfo", JSON.stringify(userData));
    
    // Update state
    setUser(userData);
    setIsAuthenticated(true);
    
    // Redirect to dashboard
    setLocation("/");
  };

  const logout = () => {
    // Clear auth data from localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("userInfo");
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Redirect to login
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout
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