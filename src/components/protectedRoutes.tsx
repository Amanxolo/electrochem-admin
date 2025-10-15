"use client";
import React, { useEffect } from "react";
import { useUserhook } from "@/contexts/userContext";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export function ProtectedRoutes({ children }: { children: React.ReactNode }) {
  const publicpaths = ["/login"];
  const pathname = usePathname();
  const { token, isloading } = useUserhook();
  const router = useRouter();
  useEffect(() => {
    if (isloading) return;
    if (!pathname) return;
    if (!token && !publicpaths.includes(pathname)) {
      toast.error("Please Login to access this page");
      router.push("/login");
    }
  }, [token, isloading, pathname, router,publicpaths]);
  return <>{children}</>;
}
