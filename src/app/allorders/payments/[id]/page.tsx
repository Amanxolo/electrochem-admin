"use client";
import { useState, useEffect, use } from "react";
import { IPartialPayments, IPayment } from "../../../../../models/payment";
import { Plus, ArrowLeft, History, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [paymentData, setPaymentData] = useState<IPayment | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<Date | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
  }, [id]);
  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const fetchPaymentDetails = async () => {
    try {
      const res = await fetch(`/api/paymentsDetail?paymentId=${id}`);
      const data = await res.json();

      if (res.ok) {
        const partialPaymemtsData: IPartialPayments[] =
          data.payment?.partial_payments || [];
        if (data.payment?.razorpay_order_id) {
          const prevData: IPartialPayments = {
            payment_mode: data.payment.payment_mode,
            payment_status: data.payment.payment_status,
            razorpay_order_id: data.payment.razorpay_order_id,
            amount: data.payment.amount,
          };
          partialPaymemtsData.push(prevData);

          data.payment.partial_payments = partialPaymemtsData;
          if (data.payment.payment_status === "paid")
            data.payment.paidAmount = Number(prevData.amount);
        }
        //  console.log(data.payment)
        setPaymentData(data.payment);
      }
    } catch (err) {
      console.log(err);
      toast.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualPayment = async () => {
    if (!paymentData) {
      return toast.error("Payment data not loaded");
    }
    const remaining = paymentData.amount - (paymentData.paidAmount || 0);
    if (
      !manualAmount ||
      Number(manualAmount) <= 0 ||
      Number(manualAmount) > remaining
    )
      return toast.error(
        "Enter a valid amount. Remaining balance is ₹" + remaining,
      );
    if (!date) return toast.error("Please select a valid date");
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/paymentsDetail?paymentId=${id}&type=manual`,
        {
          method: "PUT",
          body: JSON.stringify({
            amount: Number(manualAmount),
            reference: manualRef,
            payment_mode: "Cash On Delivery",
            date: date,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to Update Details.");
      }
      if (res.ok) {
        toast.success(data.message || "Payment recorded successfully");
        setManualAmount("");
        setManualRef("");
        fetchPaymentDetails();
      }
    } catch (err) {
      toast.error("Failed to add payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !paymentData)
    return <div className="p-10 text-center">Loading Payment...</div>;

  const remaining = paymentData.amount - (paymentData.paidAmount || 0);
  const getStatusColor = (status: string) => {
    if (status === "paid")
      return "text-md font-bold text-green-600 font-mono border-1 rounded-md px-4 bg-green-200 border-green-800";
    else if (status === "pending")
      return "text-md font-bold text-red-600 font-mono border-1 rounded-md px-4 bg-red-200 border-red-800";
    else
      return "text-md font-bold text-gray-600 font-mono border-1 rounded-md px-4 bg-gray-200 border-gray-800";
  };
  return (
    <div className="w-[100%] h-auto min-h-[100vh] p-6 space-y-6 bg-white">
      <Link
        href="/allorders"
        className="flex items-center text-sm text-gray-500 hover:text-black"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to Orders
      </Link>

      <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-green-700">
            Payment Details{" "}
          </h1>
          <p className="text-sm text-gray-500 font-mono">ID: {id}</p>
          <p className="text-sm text-gray-500 font-mono">
            Payment Status:{" "}
            <span className={getStatusColor(paymentData.payment_status)}>
              {paymentData.payment_status.toUpperCase()}
            </span>
          </p>
        </div>
        <div className="flex gap-4">
          <StatBox
            label="Total Amount"
            value={`₹${paymentData.amount}`}
            color="text-black"
          />
          <StatBox
            label="Paid"
            value={`₹${paymentData?.paidAmount || 0}`}
            color="text-green-600"
          />
          <StatBox
            label="Remaining"
            value={`₹${remaining}`}
            color="text-red-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {paymentData.payment_status === "paid" ? (
          <div className=" flex flex-col max-h-[300px] items-center justify-center py-12 bg-green-50 rounded-3xl border border-green-200">
            <CheckCircle2 size={48} className="text-green-600 mb-4" />
            <p className="text-2xl font-bold text-green-700">
              This order is fully paid.
            </p>
            
          </div>
        ) : (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
              <h2 className="font-bold text-black flex items-center gap-2 mb-4">
                <Plus size={18} /> Record Manual Payment
              </h2>
              <div className="space-y-3 flex flex-col justify-center items-center">
                <div className="w-full">
                  <label className=" text-[10px] font-bold uppercase text-gray-700">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full p-2 border text-black border-green-400 rounded-lg mt-1"
                    placeholder="0.00"
                  />
                </div>
                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase text-gray-700">
                    Reference / Note
                  </label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    className="w-full text-black p-2 border border-green-400 rounded-lg mt-1"
                    placeholder="e.g. Bank Transfer ID"
                  />
                </div>
                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase text-gray-700">
                    Recieved On:
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(date)}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.valueAsDate)}
                    className="w-full text-black p-2 border border-green-400 rounded-lg mt-1"
                    placeholder="e.g. Bank Transfer ID"
                  />
                </div>
                <button
                  onClick={handleAddManualPayment}
                  disabled={isSubmitting}
                  className="w-full max-w-[40%] cursor-pointer bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Add to Ledger"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="lg:col-span-2 bg-white border rounded-2xl p-6">
          <h2 className="font-bold text-black flex items-center gap-2 mb-4">
            <History size={18} /> Transaction History
          </h2>
          <div className="space-y-4">
            {paymentData.partial_payments?.map(
              (p: IPartialPayments, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${p.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-300 text-red-500"}`}
                    >
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-blue-700 text-sm">
                        ₹{p.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-blue-500 uppercase">
                        {p.payment_mode} • {p.reference || p.razorpay_order_id}
                      </p>
                      <p
                        suppressHydrationWarning={true}
                        className="text-[10px] text-blue-500 uppercase"
                      >
                        Paid on:{" "}
                        {p.date
                          ? new Date(p.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              timeZone: "Asia/Kolkata",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                      p.payment_status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {p.payment_status}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}
