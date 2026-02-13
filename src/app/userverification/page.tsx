"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  CheckCircle,
  Eye,
  User as UserIcon,
  Calendar,
  Mail,
  X,
} from "lucide-react";

interface IUser {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
  userType: "individual" | "reseller" | "oem";
  documents: {
    aadhar: string;
    pan: string;
    gstin?: string;
    _id: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function UserVerification() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const userResponse = await fetch(
          "/api/users?queryType=forVerification",
          {
            method: "GET",
          },
        );
        const userData = await userResponse.json();
        setUsers(userData.users || []);
      } catch (error) {
        toast.error("Error fetching users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleVerify = async (userId: string) => {
    try {
      const verifyUser = await fetch("/api/users?queryType=verifyUser", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      if (verifyUser.ok) {
        toast.success("User verified successfully");
        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, isVerified: true } : user,
          ),
        );
      } else {
        toast.error("Failed to verify user");
      }
    } catch (error) {
      toast.error("Error verifying user");
    }
  };

  const handleFindUserByEmail = async () => {
    try {
      if (!searchQuery.trim()) {
        toast.error("Please enter a valid email to search");
        return;
      }
      setLoading(true);
      const userResponse = await fetch(
        `/api/users?queryType=forVerificationbyEmail&email=${encodeURIComponent(searchQuery)}`,
        {
          method: "GET",
        },
      );
      const userData = await userResponse.json();
      if (!userResponse.ok) {
        // console.error("Error fetching user by email:", userData);
        toast.error(userData.message || "User not found");
      }
      if (!userData.user || userData.user.length === 0) {
        toast.error("No user found with the provided email");
        return;
      }
      setUsers(userData.user ? userData.user : []);
    } catch (error) {
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            User Verification
          </h1>
          <p className="text-slate-500 font-medium">
            Review submitted documents for account approval
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 mt-6">
            <input
              type="text"
              placeholder="Search User by email"
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 placeholder-slate-500
              text-slate-700
               border border-slate-300 rounded-lg w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              className=" bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl 
            cursor-pointer font-bold text-sm flex items-center justify-center mt-6 sm:mt-0"
              onClick={handleFindUserByEmail}
            >
              Search User
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-semibold">
              Fetching pending applications...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <p className="text-slate-400 text-lg italic">
              No users pending verification at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user._id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">
                        {user.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {user.userType}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {user.isVerified ? "Verified" : "Pending"}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={14} className="text-slate-400" />
                      <span>
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Verification Documents
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Aadhar", src: user.documents.aadhar },
                        { label: "PAN", src: user.documents.pan },
                        { label: "GSTIN", src: user.documents.gstin },
                      ].map(
                        (doc, i) =>
                          doc.src && (
                            <div
                              key={i}
                              className="group relative aspect-square rounded-lg bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer"
                              onClick={() => setPreviewImage(doc.src || null)}
                            >
                              <Image
                                src={doc.src}
                                alt={doc.label}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye size={18} className="text-white" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-1 text-[9px] font-bold text-center text-slate-700">
                                {doc.label}
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 flex gap-2 border-t border-slate-100 ">
                  <button
                    onClick={() => handleVerify(user._id)}
                    disabled={user.isVerified === true}
                    className="flex-1 bg-green-600
                     hover:bg-green-700 text-white py-2.5
                      rounded-xl cursor-pointer font-bold text-sm flex 
                      items-center justify-center gap-2 transition-colors
                      disabled:bg-slate-200 
                     disabled:text-slate-500 
                        disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={16} /> {user.isVerified ? "Verified" : "Verify User"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-10 backdrop-blur-sm">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
            <Image
              src={previewImage}
              alt="Document Preview"
              width={1200}
              height={800}
              className="object-contain max-h-full rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
