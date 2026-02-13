"use client";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Hash,
  Package,
  Clock,
  User,
  Filter,
  AlertCircle,
} from "lucide-react";


// --- Interfaces ---
interface IPayment {
  _id: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
}

interface IUser {
  _id: string;
  name: string;
  email: string;
  userType: "reseller" | "oem" | "individual";
}

interface IItems {
  product_id: {
    _id: string;
    productName: string;
    productCategory: string;
  };
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
  items: IItems[];
}

export default function AllOrdersPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const fetchOrders = async (idSearch?: string) => {
    try {
      setLoading(true);
      
      const endpoint = idSearch
        ? `/api/orders?queryType=orderById&id=${idSearch.trim()}`
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
        if (idSearch && fetchedOrders.length === 0) {
          toast.error("No order found with that ID");
        }
      } else {
        toast.error("Failed to fetch orders");
        setOrders([]);
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
        const data=await res.json();
        toast.success(data.message || "Order Status Updated ");
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

  const currentOrders = processedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-green-100 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-900">
              Order Management
            </h1>
            <p className="text-green-600/70 text-sm font-medium">
              Manage and track your orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search Email or Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 placeholder:text-slate-600 bg-white border border-green-100 rounded-lg text-sm text-black w-72 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => fetchOrders(searchQuery)}
              className="bg-green-600 cursor-pointer hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm active:scale-95"
            >
              Search
            </button>
            <div className="h-8 w-[1px] bg-green-100 mx-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold text-green-700 bg-green-100 border border-green-100 px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-green-100 transition-colors"
            >
              <option value="all">Filter Status</option>
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
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-green-600" />
            <p className="text-green-800 font-medium animate-pulse">
              Fetching orders...
            </p>
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white border-2 border-dashed border-green-100 rounded-2xl">
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
              className="mt-4 text-green-600 font-bold hover:underline text-sm"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {currentOrders.map((order) => (
              <div
                key={order._id}
                className="bg-white border border-green-50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow "
              >
                <div className=" px-6 py-3 border-b border-green-50 flex justify-between items-center">
                  <div className="flex items-center gap-6 text-xs font-medium text-green-700">
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-green-400" />{" "}
                      {order._id}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-green-400" />{" "}
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(e) =>
                        handleStatusChange(order._id, e.target.value)
                      }
                      className={`text-[10px] font-black py-1.5 px-4 rounded-md border uppercase tracking-wider outline-none transition-all ${
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
                    {updatingId === order._id && (
                      <Loader2 className="absolute -right-6 top-2 h-4 w-4 animate-spin text-green-600" />
                    )}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <User size={20} />
                      </div>
                      <div>
                        
                        <p className="text-sm font-bold text-green-900">
                          {order.user.name}
                        </p>
                        <p className="text-sm text-green-600/70 font-medium">
                          {order.user.email}
                        </p>
                        <p className="text-sm text-green-600/70 font-medium">
                          {order.user.userType}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">
                        Total Payment
                      </h4>
                      <p className="text-2xl font-black text-green-900 leading-none mb-2">
                        ₹{order.totalAmount.toLocaleString()}
                      </p>
                      <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                        {order.payment.payment_mode}{" "}
                        <span className="text-slate-300">|</span>{" "}
                        {order.payment.payment_status}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 bg-green-50/20 rounded-xl border border-green-50/50 p-5">
                    <h4 className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Package size={14} /> Items List ({order.items.length})
                    </h4>
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs border-b border-green-100/50 pb-3 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-bold text-green-900">
                              {item.product_id.productName}
                              <span className="text-[12px] text-green-600 font-mono">
                                ({item.product_id._id}) 
                            </span>
                            </span>
                            
                          </div>
                          <div className="flex items-center">
                            <div className="text-right">
                              <span className="text-green-700 font-bold">
                                x{item.quantity}
                              </span>
                            </div>
                            <div className="text-right w-24">
                              <span className="font-black text-green-950">
                                ₹{item.Price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
