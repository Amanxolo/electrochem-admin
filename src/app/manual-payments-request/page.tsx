"use client";
import React, { useEffect, useState } from "react";
import ManualPaymentList,{ManualPaymentRequest} from "@/components/ManualPaymentList";
import { toast } from "sonner";
export default function ManualPaymentsDashboard() {
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manualPaymentRequests/getRequests"); 
      if (res.ok) {
        const data = await res.json();
        console.log(data)
        setRequests(data.requests || []);
      }
    } catch (err) {
      toast.error( "Error Fetching List");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRequests();
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Incoming Payment Verification Proofs</h1>
        <p className="text-sm text-slate-500 mt-1">Review manual bank transfers, verify UTR reference data, and update statuses.</p>
      </div>

      {loading ? (
        <div className="p-12 text-center animate-pulse bg-white border rounded-3xl h-64 text-slate-400 flex items-center justify-center">
          Getting Lists...
        </div>
      ) : (
        <ManualPaymentList requests={requests} onStatusUpdated={fetchAllRequests} />
      )}
    </div>
  );
}