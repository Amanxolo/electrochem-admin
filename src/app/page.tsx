"use client";
import Link from "next/link";
import { useUserhook } from "@/contexts/userContext";
import {
  Layers3,
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const { token, logout } = useUserhook();
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [newUsers, setNewUsers] = useState<number>(0);
  const [userGrowth, setUserGrowth] = useState<number>(0);

  useEffect(() => {
    const getAnalytics = async () => {
      const res = await fetch("/api/analytics", {
        method: "GET",
      });
      const { totalUsers, newUsers, previousUser } = await res.json();

      if (res.ok) {
        setTotalUsers(totalUsers);
        setNewUsers(newUsers);

        let growth = 0;
        if (previousUser > 0) {
          growth = ((totalUsers - previousUser) / previousUser) * 100;
          
        } else if (totalUsers > 0) {
          growth = 100;
        }

        setUserGrowth(Number(growth.toFixed(1)));
      }
    };
    getAnalytics();
  }, []);

  return (
    <>
      <header className="py-4 sticky top-0 z-10 px-4 bg-white/20 backdrop-blur-md flex items-center justify-between text-xl">
        <div>
          <Link href="/" className="flex items-center gap-2 text-green-700">
            <Layers3 className="h-6 w-6" />
            <span className="font-bold">Electrochem Admin</span>
          </Link>
        </div>

        <nav className="flex items-end gap-6 pr-5">
          <Link
            href="/products"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Products
          </Link>

          <Link
            href="signup"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Sign Up
          </Link>
          {token ? (
            <button
              onClick={logout}
              className="text-sm font-medium hover:underline underline-offset-4 cursor-pointer"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              login
            </Link>
          )}
        </nav>
      </header>

      <section className="bg-slate-50 px-4 py-12 min-h-[100vh]">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-green-700 mb-4">
            User Analytics
          </h1>
          <p className="text-slate-500">
            An overview of your applications user base.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-6 justify-center">
          
          <div className="flex-1 min-w-[280px] max-w-sm p-6 bg-white border border-slate-200 rounded-xl shadow-lg transition-all duration-300 ease-in-out ">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="mb-1 text-base font-semibold text-slate-500">
                  Total Users
                </h3>
                <p className="text-4xl font-bold text-slate-800">
                  {totalUsers}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>

          
          <div className="flex-1 min-w-[280px] max-w-sm p-6 bg-white border border-slate-200 rounded-xl shadow-lg transition-all duration-300 ease-in-out ">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="mb-1 text-base font-semibold text-slate-500">
                  New Users (Last 30 days)
                </h3>
                <p className="text-4xl font-bold text-slate-800">{newUsers}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserPlus className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          
          <div className="flex-1 min-w-[280px] max-w-sm p-6 bg-white border border-slate-200 rounded-xl shadow-lg transition-all duration-300 ease-in-out ">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="mb-1 text-base font-semibold text-slate-500">
                  User Growth (30d)
                </h3>
                <p
                  className={`text-4xl font-bold ${
                    userGrowth >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {userGrowth >= 0 ? "+" : ""}
                  {userGrowth}%
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${
                  userGrowth >= 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {userGrowth >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}