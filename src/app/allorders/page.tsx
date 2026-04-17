"use client";
import { useState, useEffect, useMemo } from "react";
import { Address } from "../../../models/user";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Hash,
  Package,
  Clock,
  User,
  AlertCircle,
  MapPin,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
interface IPayment {
  _id: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  paidAmount?: number;
  razorpay_order_id?: string;
}
interface IUser {
  _id: string;
  name: string;
  email: string;
  userType: "reseller" | "oem" | "individual";
}
interface IItems {
  product_id: { _id: string; productName: string; productCategory: string };
  quantity: number;
  Price: number;
}
interface IOrder {
  _id: string;
  user: IUser;
  totalAmount: number;
  status:
    | "pending"
    | "placed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  createdAt: string;
  payment: IPayment;
  shippingAddress: Address;
  items: IItems[];
}

export default function AllOrdersPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();
  const fetchOrders = async (idSearch?: string) => {
    try {
      setLoading(true);
      const endpoint = idSearch
        ? `/api/orders?queryType=allOrders&emailId=${idSearch.trim()}`
        : `/api/orders?queryType=allOrders`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const fetchedOrders = Array.isArray(data.allPlacedOrders)
          ? data.allPlacedOrders
          : data.order
            ? [data.order]
            : [];
        setOrders(fetchedOrders);
      } else {
        toast.error("Failed to fetch orders");
      }
    } catch (error) {
      toast.error("Error fetching orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      const res = await fetch(`/api/orders?queryType=statusUpdate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        toast.success("Order Status Updated");
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, status: newStatus as IOrder["status"] }
              : o,
          ),
        );
      }
    } catch (err) {
      toast.error("Error updating status");
    } finally {
      setUpdatingId(null);
    }
  };

  const processedOrders = useMemo(() => {
    let filtered = [...orders];
    if (statusFilter !== "all")
      filtered = filtered.filter((o) => o.status === statusFilter);
    if (searchQuery && searchQuery.length < 15) {
      filtered = filtered.filter(
        (o) =>
          o.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o._id.includes(searchQuery),
      );
    }
    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const userTypeStyles = {
    individual: "bg-blue-100 text-blue-700 border-blue-200",
    reseller: "bg-purple-100 text-purple-700 border-purple-200",
    oem: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="p-4 md:p-6 bg-[#f8fafc] min-h-screen text-black">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="mb-8 flex flex-col gap-4 border-b border-green-100 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-green-900">
                Order Management
              </h1>
              <p className="text-green-600/70 text-sm font-medium">
                Tracking {processedOrders.length} orders
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto text-sm font-bold text-green-700 bg-white border border-green-200 px-4 py-2.5 rounded-xl outline-none cursor-pointer hover:border-green-400 transition-all appearance-none"
            >
              <option value="all">All Statuses</option>
              {[
                "pending",
                "placed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ].map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search Email or Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-green-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => fetchOrders(searchQuery)}
              className="w-full sm:w-32 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
            >
              Search
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-green-600" />
            <p className="text-green-800 font-medium">Fetching orders...</p>
          </div>
        ) : processedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-green-100 rounded-2xl">
            <AlertCircle className="h-12 w-12 text-green-200 mb-4" />
            <h3 className="text-lg font-bold text-green-900">
              No Orders Found
            </h3>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                fetchOrders();
              }}
              className="mt-4 text-green-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {processedOrders.map((order) => {
              let paidAmount: number = 0;
              (order.payment?.razorpay_order_id &&
              order.payment.payment_status) === "paid"
                ? (paidAmount = order.totalAmount)
                : (paidAmount = order.payment?.paidAmount || 0);
              return (
                <div
                  key={order._id}
                  className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <div className="px-4 md:px-6 py-4 bg-slate-50/50 border-b border-green-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] md:text-xs font-medium text-green-700">
                      <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-green-100">
                        <Hash className="h-3.5 w-3.5 text-green-400" />{" "}
                        {order._id}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-green-400" />{" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="relative inline-block w-full sm:w-auto">
                      <select
                        value={order.status}
                        disabled={updatingId === order._id}
                        onChange={(e) =>
                          handleStatusChange(order._id, e.target.value)
                        }
                        className={`w-full sm:w-auto text-[10px] font-black py-2 px-4 rounded-lg border uppercase tracking-wider outline-none cursor-pointer transition-all appearance-none pr-10 ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : order.status === "cancelled"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {[
                          "pending",
                          "placed",
                          "processing",
                          "shipped",
                          "delivered",
                          "cancelled",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-50" />
                      {updatingId === order._id && (
                        <Loader2 className="absolute -left-6 top-2 h-4 w-4 animate-spin text-green-600" />
                      )}
                    </div>
                  </div>

                  <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-green-50 rounded-xl text-green-600 shrink-0">
                          <User size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-green-900 truncate">
                            {order.user.name}
                          </p>
                          <p className="text-sm text-green-600/70 font-medium truncate mb-2">
                            {order.user.email}
                          </p>
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold border rounded-md uppercase ${userTypeStyles[order.user.userType]}`}
                          >
                            {order.user.userType}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-3 text-slate-400">
                          <MapPin size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            Shipping Address
                          </span>
                          <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded bg-white border border-slate-200 text-slate-500 uppercase">
                            {order.shippingAddress.type}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p className="font-semibold text-slate-800">
                            {order.shippingAddress.street}
                          </p>
                          <p>
                            {order.shippingAddress.city},{" "}
                            {order.shippingAddress.state} -{" "}
                            {order.shippingAddress.zipCode}
                          </p>
                          <p className="text-xs font-mono mt-2 text-green-700 bg-green-100/50 inline-block px-2 py-1 rounded">
                            {order.shippingAddress.phone}
                          </p>
                        </div>
                      </div>

                      <div className="w-full bg-gradient-to-br from-green-100 to-green-200 text-black rounded-2xl shadow-md overflow-hidden">
                        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-inner">
                              <CreditCard size={24} className="text-black" />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-green-700 tracking-widest mb-0.5">
                                  Total Payable
                                </p>
                                <p className="text-2xl font-black tabular-nums">
                                  ₹{order.totalAmount.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-green-700 tracking-widest mb-0.5">
                                  Remaining Balance
                                </p>
                                <p className="text-2xl font-black tabular-nums">
                                  ₹{order.totalAmount-paidAmount}
                                </p>
                              </div>
                              <div className="h-8 w-px bg-white/20 hidden sm:block" />{" "}
                            </div>
                          </div>

                          <div className="w-full sm:w-auto text-left sm:text-right pt-4 sm:pt-0 border-t border-white/10 sm:border-0">
                            <p className="text-[10px] font-bold uppercase text-green-700 tracking-widest mb-1">
                              Payment Status
                            </p>
                            <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-black uppercase border border-white/30">
                              {order.payment?.payment_status || "Pending"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            router.push(
                              `/allorders/payments/${order.payment._id}`,
                            )
                          }
                          className="ml-[75%] py-2 px-4 text-blue-700 cursor-pointer "
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <div className="bg-slate-50/50 rounded-2xl border border-green-50 p-4 md:p-5">
                        <h4 className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Package size={14} /> Items Summary (
                          {order.items.length})
                        </h4>
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-green-50"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-green-900 truncate">
                                  {item.product_id.productName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                  ID: {item.product_id._id}
                                </span>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0">
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                  Qty: {item.quantity}
                                </span>
                                <span className="text-sm font-black text-green-950">
                                  ₹{item.Price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
