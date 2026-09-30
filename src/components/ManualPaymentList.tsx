"use client";
import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  IndianRupee,
  Loader2,
  User,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

export interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
}

export interface PopulatedOrder {
  _id: string;
  totalAmount: number;

  createdAt: string;
  
}

export interface ManualPaymentRequest {
  _id: string;
  orderId: PopulatedOrder;
  userId: PopulatedUser;
  amount: string;
  reference?: string;
  url: string;
  status: "Pending" | "Approved" | "Declined";
  createdAt: string;
}

interface ManualPaymentListProps {
  requests: ManualPaymentRequest[];
  onStatusUpdated: () => void;
}

export default function ManualPaymentList({
  requests,
  onStatusUpdated,
}: ManualPaymentListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (
    id: string,
    nextStatus: "Pending" | "Approved" | "Declined",
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/manualPaymentRequests/updateRequests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id, status: nextStatus }), 
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update state");

      toast.success(`Request status updated to ${nextStatus}.`);
      onStatusUpdated();
    } catch (err) {
      toast.error( "Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadProof = async (fileUrl: string, orderId: string) => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt_Order_${orderId.slice(-6)}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Could not fetch file stream for downloading.");
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-6">
        <p className="text-sm font-semibold text-slate-800">
          No payment requests log recorded
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white w-full rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="p-4 pl-6">User Details</th>
              <th className="p-4">Order Details</th>
              <th className="p-4">Reference Number</th>
              <th className="p-4">Amount Uploaded</th>
              <th className="p-4">Verification Artifacts</th>
              <th className="p-4 pr-6 text-right">Actions / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {requests.map((req) => {
              const user = req.userId;
              const order = req.orderId;

              return (
                <tr
                  key={req._id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {user?.name || "Deleted User"}
                        </span>
                        <span className="text-xs text-slate-400 block truncate max-w-[200px]">
                          {user?.email} {user?.phone ? `• ${user.phone}` : ""}
                        </span>
                        {user?.companyName && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                            {user.companyName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div>
                      <span className="font-mono text-xs font-bold text-green-600 flex items-center gap-1.5">
                        <span>
                          #
                          {order?._id
                            ? order._id.slice(-8).toUpperCase()
                            : "N/A"}
                        </span>

                        {order?._id && (
                          <Copy
                            onClick={() => {
                              navigator.clipboard.writeText(order._id);
                              toast.success("Order ID copied to clipboard!");
                            }}
                            className="h-3.5 w-3.5 text-slate-400 hover:text-green-600 cursor-pointer transition-colors inline-block"
                          />
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                        <span>
                          Total: ₹
                          {order?.totalAmount?.toLocaleString("en-IN") || 0}
                        </span>
                        <span>•</span>
                      </div>
                    </div>
                  </td>

                  {/* 3. Tracking Reference Key */}
                  <td className="p-4 text-slate-600 font-mono text-xs">
                    {req.reference ? (
                      <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        {req.reference}
                      </span>
                    ) : (
                      <span className="text-slate-600">N/A</span>
                    )}
                  </td>

                  {/* 4. Price Ledger Matrix */}
                  <td className="p-4 font-extrabold text-slate-900">
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
                      {Number(req.amount).toLocaleString("en-IN")}
                    </span>
                  </td>

                  {/* 5. Image Actions Row */}
                  <td className="p-4 space-x-2 whitespace-nowrap">
                    <a
                      href={req.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                    <button
                      onClick={() =>
                        handleDownloadProof(req.url, order?._id || req._id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-800 bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {/* Status Badge displaying current state */}
                      <StatusBadge status={req.status} />

                      {req.status === "Pending" ? (
                        <>
                          {/* 1. Approve Button */}
                          <button
                            onClick={() =>
                              handleUpdateStatus(req._id, "Approved")
                            }
                            disabled={updatingId === req._id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-100 disabled:opacity-50"
                          >
                            {updatingId === req._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </button>

                          
                          <button
                            onClick={() =>
                              handleUpdateStatus(req._id, "Declined")
                            }
                            disabled={updatingId === req._id}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-rose-100 disabled:opacity-50"
                          >
                            {updatingId === req._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Decline"
                            )}
                          </button>
                        </>
                      ) : (
                       
                        <button
                          onClick={() => handleUpdateStatus(req._id, "Pending")}
                          disabled={updatingId === req._id}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {updatingId === req._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Revert"
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "Pending" | "Approved" | "Declined" }) {
  if (status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
      </span>
    );
  }
  
  if (status === "Declined") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">
        <XCircle className="h-3.5 w-3.5" /> Declined
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">
      <Clock className="h-3.5 w-3.5" /> Pending
    </span>
  );
}
