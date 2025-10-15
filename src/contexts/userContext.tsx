"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
interface User {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isloading: boolean;
}
const userContext = React.createContext<User | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isloading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      const verifyToken = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("/api/verify-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            setToken(storedToken);
          } else {
            localStorage.removeItem("token");
            setToken(null);
            toast.error("Session Expired and Invalid Token");
            router.push("/login");
          }
        } catch (error) {
          console.error("Failed to verify token:", error);
          toast.error("Could not connect to the server.");
        } finally {
          setIsLoading(false);
        }
      };
      verifyToken();
    } else setIsLoading(false);
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    toast.success("Admin logged out. Redirecting to login.");

    router.push("/login");
  };
  return (
    <userContext.Provider value={{ token, login, logout, isloading }}>
      {children}
    </userContext.Provider>
  );
}

export function useUserhook() {
  const context = React.useContext(userContext);
  if (!context) {
    throw new Error("useUserhook must be used within a UserProvider");
  }
  return context;
}
