"use client";
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search, Loader2, Building2 ,Loader} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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
  const [downloadingGST, setDownloadingGST] = useState<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/users?queryType=all');
        if (!res.ok) throw new Error("Failed to fetch users");
        
        const data = await res.json();
        setAllOrders(data.allOrders || []); 
        console.log("Fetched users:", data.allOrders);
      } catch (error) {
        toast.error("Error loading user data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  
  const filteredUsers = allOrders.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    if (filteredUsers.length === 0) return toast.error("No data to export");

    const worksheetData = filteredUsers.map((user) => ({
      "Company Name": user.companyName || "—",
      "Contact Name": user.name,
      "Email": user.email,
      "Phone": user.addresses?.[0]?.phone || "N/A",
      "User Type": user.userType?.toUpperCase(),
      "Total Orders": user.totalOrders || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ElectroChem Users");

    XLSX.writeFile(workbook, `ElectroChem_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel file downloaded");
  };
  const isImagePath = (src?: string) =>
    typeof src === "string" &&
    (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:"));

  const handleGSTDownload = async (gstin: string|undefined,userEmail:string) => {
    if(!gstin || !isImagePath(gstin)){
      toast.error("No GSTIN found");
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
    else if (contentType?.includes("application/pdf")) extension = "pdf";
    const fileName = `GSTIN_${userEmail || "document"}.${extension}`;
    link.setAttribute("download", fileName);
    
    document.body.appendChild(link);
    link.click()
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    // console.error("Download failed:", error);
    toast.error("Could not download the document");
  }finally{
    setDownloadingGST((prev) => ({ ...prev, [gstin]: false }));
  }
  }
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Directory</h1>
            <p className="text-slate-500">Managing {allOrders.length} registered accounts</p>
          </div>
          
          <button
            onClick={exportToExcel}
            disabled={loading}
            className="flex items-center cursor-pointer justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={20} />
            Export to Excel
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by company, name or email..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none shadow-sm text-black"
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {user.companyName ? (
                        <Link
                          href={`/users/${user._id}`}
                          className="flex items-center gap-2 font-semibold text-green-700 hover:text-green-900 hover:underline"
                        >
                          <Building2 size={15} className="flex-shrink-0" />
                          {user.companyName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.addresses?.[0]?.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        user.userType === 'individual' ? 'bg-blue-100 text-blue-700' : 
                        
                        user.userType === 'reseller' ? 'bg-yellow-100 text-yellow-700' :
                        user.userType === 'oem' ? 'bg-green-100 text-green-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{user.totalOrders || 0}</td>
                    {user.documents?.gstin && <td className="px-6 py-4 text-slate-900 font-bold cursor-pointer">{!downloadingGST ? <Loader2 className="animate-spin text-green-600 mb-2" size={20} /> :  <Download onClick={() => handleGSTDownload(user.documents?.gstin,user.email)}/>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}