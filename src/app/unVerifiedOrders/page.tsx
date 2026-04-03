"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Address } from "../../../models/user";
import { useRouter } from "next/navigation";
interface IItems {
  product_id: {
    _id: string;
    productName: string;
    productCategory: string;
  };
  quantity: number;
  Price: number;
}

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
  userType: ["reseller" | "oem" | "individual"];
}
interface IOrder {
  _id: string;
  user: IUser;
  totalAmount: number;
  status: string;
  createdAt: string;
  payment?: IPayment;
  items: IItems[];
  isEmailSent: boolean;
  shippingAddress: Address;
}
export default function OrderVerificationPage() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const router = useRouter();
  const handleFindUserByEmail=async()=>{

    try{
      setLoading(true)
      const res=await fetch(`/api/orders?queryType=unVerifiedOrders&emailId=${searchQuery}`)
      if(!res.ok){
        toast.error("Error fetching orders for verification")
        return;
      }
      const data = await res.json();
      setOrders(data.orders);

    }catch(error){
        toast.error("Error finding the Order.")
    }finally{
      setLoading(false)
    }
  }
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          "/api/orders?queryType=unVerifiedOrders",
        );
        if (!res.ok) {
          toast.error("Error fetching orders for verification");
          return;
        }
        const data = await res.json();
        setOrders(data.orders);
      } catch (error) {
        toast.error("Error fetching orders for verification");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const generateInvoice = (orderId: string) => {
    router.push(`unVerifiedOrders/${orderId}`);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Order Verification
          </h1>
          <p className="text-slate-500 font-medium">
            Review orders for approval.
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 mt-6">
            <input
              type="text"
              placeholder="Search User by email"
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 placeholder-slate-500
              text-slate-700
               border border-slate-300 rounded-lg w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              className=" bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl 
            cursor-pointer font-bold text-sm flex items-center justify-center mt-6 sm:mt-0"
                onClick={handleFindUserByEmail}
            >
              Search User
            </button>
          </div>
        </header>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold">
            Fetching pending Orders...
          </p>
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-slate-500 font-semibold">
                No Orders pending for verification.
              </p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {orders.map((order: IOrder) => (
                <div
                  key={order._id}
                  className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden shadow-sm"
                >
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {order.user.name}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {order.user.email}
                        </p>

                        <div className="w-[85%] md:w-[250px] flex-shrink-0 p-4 border rounded-lg bg-white mt-2 ">
                          <div className="flex justify-between items-start mb-2">
                            <span className="px-2 py-1 text-xs font-semibold uppercase rounded bg-gray-100 text-gray-600">
                              {order.shippingAddress.type}
                            </span>
                          </div>
                          <p className="text-sm text-green-600/70 font-medium">
                            {order.shippingAddress.street}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.shippingAddress.city},{" "}
                            {order.shippingAddress.state} -{" "}
                            {order.shippingAddress.zipCode}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.shippingAddress.country}
                          </p>
                          <p className="text-sm text-black mt-2 font-mono">
                            {order.shippingAddress.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                          order.status === "pending"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="text-[10px] text-gray-600 mt-1">
                        ID: {order._id}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-3">
                        Items
                      </p>
                      <div className="space-y-3">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-600 font-mono text-xs">
                              ID:#{String(item.product_id._id).slice(-8)} |
                              Name: {String(item.product_id.productName)} | Qty:{" "}
                              {item.quantity}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">₹</span>
                              <p className=" py-1 rounded text-right text-black font-medium ">
                                {item.Price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                        Payment Details
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            ₹
                            {order.payment?.amount.toLocaleString() ||
                              order.totalAmount}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-bold ${
                              order.payment?.payment_status === "verified"
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {order.payment?.payment_status.toUpperCase() ||
                              "NOT PAID"}
                          </p>
                        </div>
                      </div>
                      
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                      onClick={() => generateInvoice(order._id)}
                      className="text-xs
                       font-bold cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-2
                        rounded-md shadow-sm transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Generate PI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}