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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users?queryType=forVerificationbyEmail&email=${encodeURIComponent(id)}`, {
          method: "GET",
        });
        // The existing endpoint searches by email, but we need by ID.
        // Use the "all" query and filter client-side.
        const allRes = await fetch(`/api/users?queryType=all`);
        if (!allRes.ok) throw new Error("Failed to fetch user");
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

  const billingAddress = user?.addresses?.find((a) => a.type === "billing") || user?.addresses?.[0];
  const shippingAddress = user?.addresses?.find((a) => a.type === "shipping");

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

  const docs = [
    { label: "GST Certificate", key: "gstin", src: user.documents?.gstin },
    { label: "AADHAR", key: "aadhar", src: user.documents?.aadhar },
    { label: "PAN", key: "pan", src: user.documents?.pan },
  ];

  const isImagePath = (src?: string) =>
    typeof src === "string" &&
    (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:"));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push("/users")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Users
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-2xl">
                <Building2 size={28} className="text-green-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {user.companyName || "—"}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">Company Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  user.userType === "reseller"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {user.userType}
              </span>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 ${
                  user.isVerified
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {user.isVerified ? (
                  <CheckCircle size={12} />
                ) : (
                  <Clock size={12} />
                )}
                {user.isVerified ? "Verified" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Contact + Stats */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Contact Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User size={16} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Contact Name</p>
                    <p className="text-slate-800 font-semibold">{user.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Email</p>
                    <p className="text-slate-800 font-semibold break-all">{user.email}</p>
                  </div>
                </div>
                {billingAddress?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Phone</p>
                      <p className="text-slate-800 font-semibold">{billingAddress.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Account Stats
              </h2>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <ShoppingBag size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{user.totalOrders || 0}</p>
                  <p className="text-xs text-slate-400 font-medium">Total Orders</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Member since{" "}
                <span className="font-semibold text-slate-600">
                  {new Date(user.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Right columns - Addresses + Documents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Addresses */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Addresses
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billing */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={15} className="text-blue-500" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Billing Address
                    </h3>
                  </div>
                  {billingAddress ? (
                    <div className="text-sm text-slate-700 space-y-0.5">
                      <p className="font-semibold">{user.companyName || user.name}</p>
                      <p>{billingAddress.street}</p>
                      <p>
                        {billingAddress.city}, {billingAddress.state}
                      </p>
                      <p>
                        {billingAddress.zipCode}, {billingAddress.country}
                      </p>
                      {billingAddress.phone && (
                        <p className="text-slate-500">{billingAddress.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-sm">Not provided</p>
                  )}
                </div>

                {/* Shipping */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={15} className="text-green-500" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Shipping Address
                    </h3>
                  </div>
                  {shippingAddress ? (
                    <div className="text-sm text-slate-700 space-y-0.5">
                      <p className="font-semibold">{user.companyName || user.name}</p>
                      <p>{shippingAddress.street}</p>
                      <p>
                        {shippingAddress.city}, {shippingAddress.state}
                      </p>
                      <p>
                        {shippingAddress.zipCode}, {shippingAddress.country}
                      </p>
                      {shippingAddress.phone && (
                        <p className="text-slate-500">{shippingAddress.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-sm">Same as billing</p>
                  )}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Verification Documents
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div key={doc.key}>
                    <p className="text-xs font-bold text-slate-500 mb-2">{doc.label}</p>
                    {isImagePath(doc.src) ? (
                      <div
                        className="group relative aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer"
                        onClick={() => setPreviewImage(doc.src || null)}
                      >
                        <Image
                          src={doc.src as string}
                          alt={doc.label}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={20} className="text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-1 text-[10px] font-bold text-center text-slate-700">
                          Click to preview
                        </div>
                      </div>
                    ) : doc.src ? (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-xs text-slate-500 break-all">{doc.src}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 italic">Not uploaded</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
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
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}