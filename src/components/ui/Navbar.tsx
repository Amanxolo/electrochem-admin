"use client";
import Link from "next/link";
import { useUserhook } from "@/contexts/userContext";
import { Layers3, BellDotIcon, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

function HeaderCartButton() {
  const [totalCount, setTotalCount] = useState<number>(0);

  const getNewComplaintsCount = useCallback(async () => {
    try {
      const res = await fetch("/api/complaints?query=getNewOrdersCount");
      if (!res.ok) return;
      const data = await res.json();
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    getNewComplaintsCount();
  }, [getNewComplaintsCount]);

  return (
    // Removed my-4 to keep the header height consistent
    <Button
      size="sm"
      variant="ghost"
      asChild
      className="relative hover:bg-white/10 text-slate-300 px-2 my-4 shrink-0"
    >
      <Link href="/notifications">
        <BellDotIcon className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-0 bg-green-500 text-black text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-black">
            {totalCount}
          </span>
        )}
      </Link>
    </Button>
  );
}

export default function Navbar() {
  const { token, logout } = useUserhook();
  const router = useRouter();

  const linkClass =
    "text-sm font-semibold text-slate-300 hover:text-white hover:underline underline-offset-4 transition-all whitespace-nowrap";

  return (
    <header className="sticky top-0 z-50 w-full bg-black/50 border-b border-white/10 backdrop-blur-md">
      <div className="max-w-full mx-auto h-16 flex items-center justify-between px-8">
        <div className="flex items-center shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1 bg-green-500 rounded-lg group-hover:bg-green-400 transition-colors">
              <Layers3 className="h-5 w-5 text-black" />
            </div>
            <span className="font-black text-white tracking-tighter text-lg">
              ELECTRO<span className="text-green-500">CHEM</span>
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar ml-auto">
          <HeaderCartButton />

          <Link href="/products" className={linkClass}>
            Products
          </Link>

          <div className="flex flex-col gap-1">
            <select
              name="orders"
              id="orders"
              
              value=""
              onChange={(event) => {
                router.push(event.target.value);
              }}
              className=" border-none w-16 rounded bg-transparent text-sm outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Orders</option>
              <option value="/allorders">All Orders</option>

              <option value="/unVerifiedOrders">Un-Verified Orders</option>
              <option value="/manual-pi">PI for Manual Orders</option>
            </select>
          </div>

          <Link href="/complaints" className={linkClass}>
            Complaints
          </Link>
          <Link href="/invoices" className={linkClass}>
            Invoices
          </Link>

          <div className="flex flex-col gap-1 pointer-cursor">
            <select
              name="users"
              id="users"
              
              value=""
              onChange={(event) => {
                router.push(event.target.value);
              }}
              className=" border-none w-16 rounded bg-transparent text-sm outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="" >Users</option>
              <option value="/users">All Users</option>

              <option value="/userverification">User verification</option>
            </select>
          </div>
          <Link href="/signup" className={`${linkClass} hidden sm:block`}>
            Sign Up
          </Link>

          <div className="h-6 w-[1px] bg-white/20 mx-1 shrink-0 hidden md:block" />

          <div className="shrink-0">
            {token ? (
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm font-bold text-green-500 hover:text-green-400 transition-colors"
              >
                <User size={16} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
