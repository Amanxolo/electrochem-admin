"use client";
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  _id: string;
  name: string;
  email: string;
  userType: "individual" | "reseller" | "oem";
  totalOrders: number;
  addresses: { phone: string }[];
}

export default function UsersAdminPage() {
  const [allOrders, setAllOrders] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/users?queryType=all');
        if (!res.ok) throw new Error("Failed to fetch users");
        
        const data = await res.json();
        
        setAllOrders(data.allOrders || []); 
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
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    if (filteredUsers.length === 0) return toast.error("No data to export");

    const worksheetData = filteredUsers.map((user) => ({
      "Name": user.name,
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
            placeholder="Search by name or email..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.addresses?.[0]?.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        user.userType === 'individual' ? 'bg-blue-100 text-blue-700' : 
                        user.userType === 'reseller' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{user.totalOrders || 0}</td>
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