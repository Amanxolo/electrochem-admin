"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  X,
  ShoppingBag,
  Download,
  
} from "lucide-react";

interface Address {
  type: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

interface Documents {
  aadhar?: string;
  pan?: string;
  gstin?: string;
}

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  companyName?: string;
  userType: "individual" | "reseller" | "oem";
  isVerified: boolean;
  addresses: Address[];
  documents?: Documents;
  totalOrders: number;
  createdAt: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        setLoading(true);
        const allRes = await fetch(`/api/users?queryType=all`);
        if (!allRes.ok) throw new Error("Failed to fetch users");
        const data = await allRes.json();
        const found = (data.allOrders || []).find((u: UserDetail) => u._id === id);
        
        if (!found) {
          toast.error("User not found");
          router.push("/users");
          return;
        }
        setUser(found);
      } catch (err) {
        toast.error("Error loading user details");
        router.push("/users");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, router]);

  const isMedia = (src?: string) =>
    typeof src === "string" &&
    (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:"));

  const isPDF = (src?: string) => 
    typeof src === "string" && src.includes("/api/files/");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const billingAddress = user.addresses?.find((a) => a.type === "billing") || user.addresses?.[0];
  const shippingAddress = user.addresses?.find((a) => a.type === "shipping");

  const docs = [
    { label: "GST Certificate", key: "gstin", src: user.documents?.gstin },
    { label: "AADHAR", key: "aadhar", src: user.documents?.aadhar },
    { label: "PAN", key: "pan", src: user.documents?.pan },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-black">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/users")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Users
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-2xl">
                <Building2 size={28} className="text-green-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{user.companyName || "—"}</h1>
                <p className="text-slate-500 text-sm mt-0.5">Company Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                {user.userType}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 ${
                user.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}>
                {user.isVerified ? <CheckCircle size={12} /> : <Clock size={12} />}
                {user.isVerified ? "Verified" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Info</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold">{user.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold truncate">{user.email}</span>
                </div>
                {billingAddress?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold">{billingAddress.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Orders</h2>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl text-green-600"><ShoppingBag size={18} /></div>
                <span className="text-2xl font-bold">{user.totalOrders || 0}</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Addresses */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Addresses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Billing", data: billingAddress, color: "text-blue-500" },
                  { title: "Shipping", data: shippingAddress, color: "text-green-500" }
                ].map((addr, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className={addr.color} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{addr.title}</span>
                    </div>
                    {addr.data ? (
                      <div className="text-xs space-y-1">
                        <p className="font-bold">{user.companyName || user.name}</p>
                        <p>{addr.data.street}</p>
                        <p>{addr.data.city}, {addr.data.state} - {addr.data.zipCode}</p>
                      </div>
                    ) : <p className="text-xs italic text-slate-400">Not provided</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Verification Documents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {docs.map((doc) => {
                  const isDocMedia = isMedia(doc.src);
                  const isDocPdf = isPDF(doc.src);

                  return (
                    <div key={doc.key} className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{doc.label}</p>
                      
                      <div className={`relative aspect-video rounded-xl border overflow-hidden flex flex-col items-center justify-center ${
                        isDocMedia ? (isDocPdf ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200') : 'bg-blue-50 border-blue-100'
                      }`}>
                        {!doc.src ? (
                          <span className="text-[10px] text-slate-300 font-bold">MISSING</span>
                        ) : isDocMedia ? (
                          <>
                            {isDocPdf ? <FileText size={24} className="text-red-500" /> : <Image src={doc.src} alt={doc.label} fill className="object-cover" unoptimized />}
                            <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-[1px] p-1.5 flex justify-center gap-2">
                              <button onClick={() => setPreviewUrl(doc.src!)} className="bg-white/90 p-1 rounded-md text-slate-900 hover:text-green-600"><Eye size={14}/></button>
                              <a href={doc.src} download className="bg-white/90 p-1 rounded-md text-slate-900 hover:text-blue-600"><Download size={14}/></a>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1 p-2">
                            <span className="text-[10px] font-black text-blue-800 break-all text-center leading-tight">{doc.src}</span>
                            <button 
                              onClick={() => { navigator.clipboard.writeText(doc.src!); toast.success("Copied!"); }}
                              className="mt-1 bg-white/90 px-2 py-0.5 rounded text-[9px] font-bold text-blue-700 shadow-sm"
                            >
                              COPY
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

     
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
          <button onClick={() => setPreviewUrl(null)} className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
            <X size={28} />
          </button>
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
            <iframe src={previewUrl} className="w-full h-full border-none" title="Document Preview" />
          </div>
        </div>
      )}
    </div>
  );
}