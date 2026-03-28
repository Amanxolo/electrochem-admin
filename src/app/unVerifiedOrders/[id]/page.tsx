"use client";
import React, { useEffect, use, useState, useMemo } from "react";
import Image from "next/image";
import { Address } from "../../../../models/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Interfaces
interface IProducts {
  productCategory: string;
  productName: string;
  _id: string;
}
interface IItems {
  Price: number;
  product_id: IProducts;
  quantity: number;
}
interface IUser {
  email: string;
  name: string;
  _id: string;
}

export interface IItemsforEmail {
  id?: string;
  productName: string;
  quantity: number;
  price: number;
  productCategory: string;
  hsn: string;
  dueDate: string;
}

export interface IItemsWithOtherDetails {
  productId: string;
  name: string;
  productCategory: string;
  quantity: number;
  price: number;
  hsn: string;
  dueDate: string;
}
interface IOrder {
  _id: string;
  createdAt: string;
  items: IItems[];
  shippingAddress: Address;
  billingAddress: Address;
  totalAmount: number;
  user: IUser;
}

export interface IOtherData {
  piNumber: string;
  validUntil: string;
  paymentMode: string;
  supplierReferance: string;
  otherReferance: string;
  dispatchThru: string;
  termOfDelivery: string;
}

const ProformaInvoice = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [items, setItems] = useState<IItemsWithOtherDetails[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string>("");
  const [otherData, setOtherData] = useState<IOtherData>({
    piNumber: "",
    validUntil: "",
    paymentMode: "Bank Transfer",
    supplierReferance: "",
    otherReferance: "Standard",
    dispatchThru: "Courier",
    termOfDelivery: "",
  });
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders?queryType=orderById&id=${id}`);
        const data = await res.json();
        const ord = data.allPlacedOrders[0];
        // console.log(ord);
        setOrder(ord);
        setItems(
          ord.items.map((it: IItems) => ({
            productId: it.product_id._id,
            name: it.product_id.productName,
            productCategory: it.product_id.productCategory,
            quantity: it.quantity,
            price: it.Price,
            hsn: "8507",
            dueDate: "",
          })),
        );
        setOtherData((prev) => ({
          ...prev,
          piNumber: `PI-${ord._id.slice(-8).toUpperCase()}`,
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleOtherDataChange = (feild: keyof IOtherData, value: string) => {
    setOtherData((prev) => ({ ...prev, [feild]: value }));
  };
  // Tax Logic Engine
  const totals = useMemo(() => {
    const userState = order?.shippingAddress?.state?.toLowerCase().trim() || "";
    const isUP = userState === "uttar pradesh" || userState === "up";

    let sgst = 0,
      cgst = 0,
      igst = 0,
      subtotal = 0;

    items.forEach((item) => {
      const itemSub = item.quantity * item.price;
      const isCharger = ["charger", "chargers"].includes(
        item.productCategory?.toLowerCase().trim(),
      );
      if (isUP) {
        const r = isCharger ? 0.025 : 0.09;
        sgst += itemSub * r;
        cgst += itemSub * r;
      } else {
        const r = isCharger ? 0.05 : 0.18;
        igst += itemSub * r;
      }
      subtotal += itemSub;
    });

    const finalTotal =
      subtotal + cgst + sgst + igst - (discount || 0) + (shipping || 0);
    return { subtotal, sgst, cgst, igst, shipping, finalTotal };
  }, [items, discount, order, shipping]);

  //   Appriving and Sending PI-Email
  const handleEmailInvoice = async (
    email: string,
    items: IItemsforEmail[],
    orderId: string,
  ) => {
    try {
      setVerifying(true);
      setLiveMessage("Sending invoice email...");
      const res = await fetch("/api/sendEmails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          items,
          orderId,
          discount: discount || 0,
          shipping: shipping || 0,
          otherData,
        }),
      });
      if (res.ok) {
        toast.success("Invoice email sent successfully");
        router.push("/unverifiedOrders");
      }
    } catch (error) {
      toast.error("Error sending invoice email");
    } finally {
      setVerifying(false);
      setLiveMessage("");
    }
  };
  const handleApproveOrder = async () => {
    try {
      setVerifying(true);
      if (!order) {
        toast.error("Error Fetching Order");
        return;
      }
      const email = order.user.email;

      // console.log(items);
      // return;
      setLiveMessage("Approving order...");
      const res = await fetch("/api/orders/placeOrderforOEMandReseller", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: id,
          discount: discount || 0,
          updatedItems: items,
          shipping,
          email,
        }),
      });

      if (res.ok) {
        toast.success("Order approved successfully");

        const itemsForEmails: IItemsforEmail[] = items.map((item) => ({
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          productCategory: item.productCategory,
          hsn: item.hsn,
          dueDate: item.dueDate,
        }));
        await handleEmailInvoice(email, itemsForEmails, id);
        return;
      }
      const data=await res.json();
      toast.error(data.message || "Error approving order");
    } catch (error) {
      toast.error("Error approving order");
    } finally {
      setVerifying(false);
      setLiveMessage("");
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold">
        Loading Invoice Layout...
      </div>
    );
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  return (
    <div
      className="bg-white min-h-screen pt-8 font-sans text-[13px] text-black"
      style={{ colorScheme: "light" }}
    >
      {liveMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-emerald-100 backdrop-blur-md border border-emerald-400 px-4 py-2 rounded-full shadow-lg shadow-emerald-100/50">
            
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-emerald-100 rounded-full"></div>
              <div className="absolute w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-emerald-900 whitespace-nowrap">
              {liveMessage}
            </span>
          </div>
        </div>
      )}
      <div className="logo-header w-full flex justify-center items-center py-5">
        <div className="relative w-[30%] h-[100px]">
          <Image
            src="/images/ElectrochemLogo.svg"
            alt="Logo"
            fill
            className="object-fill"
            priority
          />
        </div>
      </div>
      <h1 className="text-center text-[36px] font-bold py-2  uppercase tracking-tight">
        Proforma Invoice
      </h1>
      <div className="max-w-[950px] mx-auto bg-white border-[1.5px] border-black shadow-none print:m-0">
        <div className="flex w-full">
          {/* Left Column */}
          <div className="w-[52%] border-r-[1.5px] border-black">
            <div className="flex p-3 border-b-[1.5px] border-black min-h-[140px]">
              <div className="leading-[1.3]">
                <p className="font-bold text-[16px]">
                  Electrochem Power Systems Private Limited
                </p>
                <p>Building No. 49, First Floor, Block-A, Sector 57.</p>
                <p>NOIDA, GAUTAM BUDDHA NAGAR</p>
                <p>Pin Code-201301</p>
                <p>GSTIN/UIN: 09AAECE2577M1Z5</p>
                <p>State Name : Uttar Pradesh, Code : 09</p>
                <p>CIN :- U31404DL2016PTC298846</p>
              </div>
            </div>

            <div className="p-3 border-b-[1.5px] border-black min-h-[130px]">
              <p>Consignee (Ship To)</p>
              <p className="font-bold text-[16px] uppercase">
                {order.user.name}
              </p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </p>
              <p className="font-bold">{order.shippingAddress.phone}</p>
              <p>State Name : {order.shippingAddress.state}</p>
            </div>

            <div className="p-3 border-b-[1.5px] border-black min-h-[130px]">
              <p>Buyer (Bill To)</p>
              <p className="font-bold text-[16px] uppercase">
                {order.user.name}
              </p>
              <p>{order.billingAddress.street}</p>
              <p>
                {order.billingAddress.city}, {order.billingAddress.state}
              </p>
              <p className="font-bold">{order.billingAddress.phone}</p>
              <p>State Name : {order.billingAddress.state}</p>
            </div>
          </div>

          {/* Right Column Grid */}
          <div className="w-[48%] flex flex-col">
            <div className="grid grid-cols-2 text-[12px]">
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Proforma Invoice No</p>
                <p>PI-{order._id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Dated</p>
                <p>{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Valid Until</p>
                <input
                  type="date"
                  value={otherData.validUntil}
                  onChange={(e) => {
                    setOtherData((prev) => ({
                      ...prev,
                      validUntil: e.target.value,
                    }));
                  }}
                  className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Modes of Payment</p>
                <input
                  type="text"
                  value={otherData.paymentMode}
                  onChange={(e) => {
                    handleOtherDataChange("paymentMode", e.target.value);
                  }}
                  className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                />
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Supplier Reference</p>
                <input
                  type="text"
                  value={otherData.supplierReferance}
                  onChange={(e) => {
                    handleOtherDataChange("supplierReferance", e.target.value);
                  }}
                  className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Other Reference(s)</p>
                <input
                  type="text"
                  value={otherData.otherReferance}
                  onChange={(e) => {
                    handleOtherDataChange("otherReferance", e.target.value);
                  }}
                  className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                />
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Dispatch Thru</p>
                <input
                  type="text"
                  value={otherData.dispatchThru}
                  onChange={(e) => {
                    handleOtherDataChange("dispatchThru", e.target.value);
                  }}
                  className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Destination</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                </p>
              </div>
            </div>
            <div className="p-2 flex-grow min-h-[150px] flex flex-col">
              <p className="font-bold text-[11px] mb-1">Terms of Delivery</p>
              <textarea
                value={otherData.termOfDelivery}
                onChange={(e) => {
                  handleOtherDataChange("termOfDelivery", e.target.value);
                }}
                className="w-full flex-grow text-left bg-gray-50 print:bg-transparent border-2 border-blue-400 p-2 focus:ring-0 overflow-y-auto resize-none break-words leading-tight"
                placeholder="Enter delivery terms here..."
              />
            </div>
          </div>
        </div>

        {/* --- MAIN TABLE --- */}
        <table className="w-full  border-t-[1.5px] border-black border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-100 border-b-[1.5px] border-black font-bold text-[11px]">
              <th className="border-r-[1.5px] border-black p-2 w-[7%] text-center">
                SI No.
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[31%] text-left px-4">
                Description of Goods
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[10%] text-center">
                HSN/SAC
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[12%] text-center">
                Due on
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[12%] text-center">
                Quantity
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[10%] text-center">
                price
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[8%] text-center">
                per
              </th>
              <th className="p-2 w-[15%] text-right pr-4">Amount</th>
            </tr>
          </thead>
          <tbody className="align-top ">
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black/10">
                <td className="border-r-[1.5px] border-black p-2 text-center">
                  {idx + 1}
                </td>
                <td className="border-r-[1.5px] border-black p-2 px-4 font-bold">
                  {item.name}
                </td>
                {/* Editable HSN */}
                <td className="border-r-[1.5px] border-black p-1 text-center">
                  <input
                    type="text"
                    value={item.hsn}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].hsn = e.target.value;
                      setItems(next);
                    }}
                    className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                  />
                </td>
                {/* Editable Due Date */}
                <td className="border-r-[1.5px] border-black p-1 text-center overflow-x-auto">
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].dueDate = e.target.value;
                      setItems(next);
                    }}
                    className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0"
                  />
                </td>
                {/* Editable quantity */}
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="number"
                    value={isNaN(item.quantity) ? 0 : item.quantity}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].quantity = e.target.valueAsNumber;
                      setItems(next);
                    }}
                    className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0 font-bold"
                  />
                </td>
                {/* Editable price */}
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="number"
                    value={isNaN(item.price) ? 0 : item.price}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].price = e.target.valueAsNumber;
                      setItems(next);
                    }}
                    className="w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0 font-medium"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-2 text-center uppercase">
                  PCS
                </td>
                <td className="p-2 text-right font-bold pr-4">
                  {(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr style={{ height: "150px" }}>
              <td className="border-r-[1.5px] border-black" colSpan={7}></td>
              <td></td>
            </tr>
          </tbody>
          <tfoot className="border-t-[1.5px] border-black font-medium text-[14px]">
            <tr>
              <td colSpan={7} className="text-right p-1 px-4">
                Subtotal
              </td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">
                {totals.subtotal.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={7}
                className="text-right p-1 px-4 font-bold text-gray-500"
              >
                Discount
              </td>
              <td className="text-right p-0 border-l border-black/5">
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.valueAsNumber || 0)}
                  className="w-full text-right bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 pr-4 focus:ring-0 font-bold"
                />
              </td>
            </tr>
            <tr>
              <td
                colSpan={7}
                className="text-right p-1 px-4 font-bold text-gray-500"
              >
                Shipping Charge
              </td>
              <td className="text-right p-0 border-l border-black/5">
                <input
                  type="number"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.valueAsNumber || 0)}
                  className="w-full text-right bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 pr-4 focus:ring-0 font-bold"
                />
              </td>
            </tr>
            <tr>
              <td colSpan={7} className="text-right p-1 px-4">
                CGST
              </td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">
                {totals.cgst.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={7} className="text-right p-1 px-4">
                SGST
              </td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">
                {totals.sgst.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b-[1.5px] border-black">
              <td colSpan={7} className="text-right p-1 px-4 pb-2">
                IGST
              </td>
              <td className="text-right p-1 px-4 pr-4 pb-2 border-l border-black/5">
                {totals.igst.toFixed(2)}
              </td>
            </tr>
            <tr className="font-bold text-[18px]">
              <td colSpan={7} className="text-right p-3 px-4 uppercase">
                Total (in Rs)
              </td>
              <td className="text-right p-3 px-4 pr-4 font-black border-l border-black/5">
                ₹{totals.finalTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="max-w-[950px] mx-auto mt-6 flex justify-center">
        <button
          onClick={handleApproveOrder}
          disabled={verifying}
          className="bg-green-600 mb-6 text-white px-10 py-3 rounded font-black uppercase shadow-lg hover:bg-gray-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Approve and Send PI
        </button>
      </div>
    </div>
  );
};

export default ProformaInvoice;
