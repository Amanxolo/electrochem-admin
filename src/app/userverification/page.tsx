"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  Eye,
  User as UserIcon,
  Mail,
  X,
  FileText,
  Download,
  Copy,
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
        const userResponse = await fetch("/api/users?queryType=forVerification");
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

  const isMedia = (src?: string) =>
    typeof src === "string" &&
    (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:"));

  const isPDFPath = (src?: string) => 
    typeof src === "string" && src.includes("/api/files/");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleVerify = async (userId: string) => {
    try {
      const verifyUser = await fetch("/api/users?queryType=verifyUser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (verifyUser.ok) {
        toast.success("User verified successfully");
        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, isVerified: true } : user
          )
        );
      }
    } catch (error) {
      toast.error("Error verifying user");
    }
  };

  const handleFindUserByEmail = async () => {
    if (!searchQuery.trim()) return toast.error("Enter email");
    try {
      setLoading(true);
      const res = await fetch(`/api/users?queryType=forVerificationbyEmail&email=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "User not found");
      setUsers(data.user || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Verification</h1>
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 mt-6">
            <input
              type="text"
              placeholder="Search User by email"
              className="px-4 py-2 border border-slate-300 rounded-lg w-full max-w-sm outline-none focus:ring-2 focus:ring-green-500 text-black"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-all cursor-pointer mt-2 md:mt-0"
              onClick={handleFindUserByEmail}
            >
              Search
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <p className="text-slate-400">No pending verifications found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div key={user._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
               
                <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-green-600" />
                    <h3 className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{user.name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${user.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {user.isVerified ? "Verified" : "Pending"}
                  </span>
                </div>

               
                <div className="p-4 space-y-4 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600 truncate"><Mail size={12} /> {user.email}</div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Documents</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Aadhar", src: user.documents.aadhar },
                        { label: "PAN", src: user.documents.pan },
                        { label: "GSTIN", src: user.documents.gstin },
                      ].map((doc, i) => {
                        const isDocMedia = isMedia(doc.src);
                        const isPDF = isPDFPath(doc.src);

                        if (!doc.src) return (
                          <div key={i} className="aspect-square rounded-lg bg-slate-50 border border-dashed flex items-center justify-center text-[8px] text-slate-300 font-bold uppercase text-center p-1">
                            {doc.label}<br/>N/A
                          </div>
                        );

                        return (
                          <div key={i} className="flex flex-col gap-1">
                            <div className={`relative aspect-square rounded-lg border overflow-hidden flex flex-col items-center justify-center ${isDocMedia ? (isPDF ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200') : 'bg-blue-50 border-blue-100'}`}>
                              
                             
                              {isDocMedia ? (
                                isPDF ? <FileText size={20} className="text-red-500" /> : <Image src={doc.src} alt={doc.label} fill className="object-cover" unoptimized />
                              ) : (
                                <span className="px-1 text-[9px] font-black text-blue-800 break-all leading-tight text-center">{doc.src}</span>
                              )}

                              
                              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 p-1.5 bg-black/40 backdrop-blur-[1px]">
                                {isDocMedia ? (
                                  <>
                                    <button onClick={() => setPreviewImage(doc.src!)} className="bg-white/90 p-1 rounded-md text-slate-900 hover:text-green-600 shadow-sm transition-colors">
                                      <Eye size={14}/>
                                    </button>
                                    <a href={doc.src} download className="bg-white/90 p-1 rounded-md text-slate-900 hover:text-blue-600 shadow-sm transition-colors">
                                      <Download size={14}/>
                                    </a>
                                  </>
                                ) : (
                                  <button onClick={() => handleCopy(doc.src!, doc.label)} className="w-full bg-white/90 py-0.5 rounded text-[10px] font-bold text-blue-700 shadow-sm flex items-center justify-center gap-1">
                                    <Copy size={12} /> COPY
                                  </button>
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">{doc.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                
                <div className="p-4 bg-slate-50 border-t">
                  <button
                    onClick={() => handleVerify(user._id)}
                    disabled={user.isVerified}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold disabled:bg-slate-200 disabled:text-slate-400 transition-all cursor-pointer"
                  >
                    {user.isVerified ? "Verified" : "Verify Account"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
            <X size={24} />
          </button>
          
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden shadow-2xl relative">
            {isPDFPath(previewImage) ? (
              <iframe src={previewImage} className="w-full h-full border-none" title="PDF Preview" />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <Image src={previewImage} alt="Preview" fill className="object-contain" unoptimized />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}