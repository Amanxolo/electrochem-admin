"use client";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Search,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";


interface Documents {
  aadhar?: string;
  pan?: string;
  gstin?: string;
}
interface UserData {
  _id: string;
  name: string;
  email: string;
  userType: "individual" | "reseller" | "oem";
  companyName?: string;
  totalOrders: number;
  addresses: { phone: string }[];
  documents?: Documents;
}

export default function UsersAdminPage() {
  const [allOrders, setAllOrders] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingGST, setDownloadingGST] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/users?queryType=all");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setAllOrders(data.allOrders || []);
      } catch (error) {
        toast.error("Error loading user data");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = allOrders.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName &&
        user.companyName.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const exportToExcel = () => {
    if (filteredUsers.length === 0) return toast.error("No data to export");
    const worksheetData = filteredUsers.map((user) => ({
      "Company Name": user.companyName || "—",
      "Contact Name": user.name,
      Email: user.email,
      Phone: user.addresses?.[0]?.phone || "N/A",
      "User Type": user.userType?.toUpperCase(),
      "Total Orders": user.totalOrders || 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(
      workbook,
      `Users_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Excel file downloaded");
  };

  const isImagePath = (src?: string) =>
    typeof src === "string" &&
    (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:"));

  const handleGSTDownload = async (
    gstin: string | undefined,
    userEmail: string,
  ) => {
    if (!gstin || !isImagePath(gstin)) {
      toast.error("No GSTIN document found");
      return;
    }
    try {
      setDownloadingGST((prev) => ({ ...prev, [gstin]: true }));
      const response = await fetch(gstin);
      if (!response.ok) throw new Error("File not found");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentType = response.headers.get("content-type");
      let extension = "pdf";
      if (contentType?.includes("image/png")) extension = "png";
      else if (contentType?.includes("image/jpeg")) extension = "jpg";

      link.setAttribute("download", `GSTIN_${userEmail}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Could not download the document");
    } finally {
      setDownloadingGST((prev) => ({ ...prev, [gstin]: false }));
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "individual":
        return "bg-blue-100 text-blue-700";
      case "reseller":
        return "bg-yellow-100 text-yellow-700";
      case "oem":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              User Directory
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Managing {allOrders.length} accounts
            </p>
          </div>

          <button
            onClick={exportToExcel}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={18} />
            <span className="whitespace-nowrap">Export Excel</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by email..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none shadow-sm text-black transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-green-600 mb-2" size={32} />
            <p className="text-slate-500 font-medium">Loading user data...</p>
          </div>
        ) : (
          <>
            
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                      Orders
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                      GST
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {user.companyName ? (
                          <Link
                            href={`/users/${user._id}`}
                            className="flex items-center gap-2 font-semibold text-green-700 hover:underline"
                          >
                            <Building2 size={16} className="shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {user.companyName}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getTypeStyles(user.userType)}`}
                        >
                          {user.userType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-bold text-center">
                        {user.totalOrders || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.documents?.gstin && (
                          <button
                            onClick={() =>
                              handleGSTDownload(
                                user.documents?.gstin,
                                user.email,
                              )
                            }
                            className="inline-flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            {downloadingGST[user.documents.gstin] ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Download size={18} />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                >
                  {/* Top Row: Company & Type */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {user.companyName ? (
                        <Link
                          href={`/users/${user._id}`}
                          className="flex items-center gap-2 font-bold text-green-700 text-lg mb-1 group"
                        >
                          <Building2 size={18} className="shrink-0" />
                          <span className="truncate group-hover:underline">
                            {user.companyName}
                          </span>
                        </Link>
                      ) : (
                        <h3 className="font-bold text-slate-800 text-lg mb-1">
                          {user.name}
                        </h3>
                      )}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${getTypeStyles(user.userType)}`}
                      >
                        {user.userType}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">
                        Orders
                      </div>
                      <div className="text-lg font-black text-slate-900 leading-none">
                        {user.totalOrders || 0}
                      </div>
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-2 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">
                        {user.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-slate-400 shrink-0" />
                      <span className="break-all">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-slate-400 shrink-0" />
                      <span>
                        {user.addresses?.[0]?.phone || "No phone provided"}
                      </span>
                    </div>
                  </div>

                  
                  {user.documents?.gstin && (
                    <button
                      onClick={() =>
                        handleGSTDownload(user.documents?.gstin, user.email)
                      }
                      disabled={downloadingGST[user.documents.gstin || ""]}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-bold text-sm transition-colors border border-green-100"
                    >
                      {downloadingGST[user.documents.gstin || ""] ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          <span>Download GST Certificate</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
