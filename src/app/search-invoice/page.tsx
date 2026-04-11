"use client";
import React, { useState, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Search, FileText, Edit3, Save, X, Send, Loader2 } from "lucide-react";
import BankDetailsPanel from "@/components/proforma-invoice/BankDetailsPanel";

interface Address {
  type: "billing" | "shipping";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

interface PIItem {
  productName: string;
  productCategory: "batteries" | "chargers" | "others";
  quantity: number;
  price: number;
  hsn: string;
  dueDate: string;
}

interface OtherData {
  piNumber: string;
  validUntil: string;
  paymentMode: string;
  supplierReferance: string;
  otherReferance: string;
  dispatchThru: string;
  termOfDelivery: string;
}

interface PIData {
  _id: string;
  piNumber: string;
  customerName: string;
  customerEmail: string;
  gstIn: string;
  shippingAddress: Address;
  billingAddress: Address;
  items: PIItem[];
  discount: number;
  shipping: number;
  otherData: OtherData;
  createdAt: string;
}

// ── Search Panel ───────────────────────────────────────────────────────────────

function SearchPanel({ onResult }: { onResult: (pi: PIData) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return toast.error("Enter a PI number to search.");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/saveInvoiceDetails?type=pi&piNumber=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!res.ok || !data.pi) {
        toast.error(data.message || "No PI found with that number.");
        return;
      }
      onResult(data.pi);
      toast.success("PI loaded successfully.");
    } catch {
      toast.error("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-16">
            <Image
              src="/images/ElectrochemLogo.svg"
              alt="Logo"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Search Invoice</h1>
              <p className="text-sm text-gray-500">Look up a PI by invoice number</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. PI-ABC12345"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-5 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            PI numbers follow the format <span className="font-mono">PI-XXXXXXXX</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── PI Editor ──────────────────────────────────────────────────────────────────

function PIEditor({ pi, onBack }: { pi: PIData; onBack: () => void }) {
  const [items, setItems] = useState<PIItem[]>(pi.items);
  const [discount, setDiscount] = useState(pi.discount ?? 0);
  const [shipping, setShipping] = useState(pi.shipping ?? 0);
  const [otherData, setOtherData] = useState<OtherData>(pi.otherData);
  const [customerName, setCustomerName] = useState(pi.customerName);
  const [customerEmail, setCustomerEmail] = useState(pi.customerEmail);
  const [gstIn, setGstIn] = useState(pi.gstIn ?? "");
  const [shippingAddress, setShippingAddress] = useState<Address>(pi.shippingAddress);
  const [billingAddress, setBillingAddress] = useState<Address>(pi.billingAddress);
  const [saving, setSaving] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");

  const handleOther = (k: keyof OtherData, v: string) =>
    setOtherData((p) => ({ ...p, [k]: v }));

  const handleShipping = (k: keyof Address, v: string) =>
    setShippingAddress((p) => ({ ...p, [k]: v }));

  const handleBilling = (k: keyof Address, v: string) =>
    setBillingAddress((p) => ({ ...p, [k]: v }));

  // ── Tax Engine ──────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const state = shippingAddress.state?.toLowerCase().trim() ?? "";
    const isUP = state === "uttar pradesh" || state === "up";
    let sgst = 0, cgst = 0, igst = 0, subtotal = 0;

    items.forEach((item) => {
      const sub = item.quantity * item.price;
      const isCharger = ["charger", "chargers"].includes(
        item.productCategory?.toLowerCase().trim()
      );
      if (isUP) {
        const r = isCharger ? 0.025 : 0.09;
        sgst += sub * r;
        cgst += sub * r;
      } else {
        igst += sub * (isCharger ? 0.05 : 0.18);
      }
      subtotal += sub;
    });

    return {
      subtotal,
      sgst,
      cgst,
      igst,
      finalTotal: subtotal + cgst + sgst + igst - (discount || 0) + (shipping || 0),
    };
  }, [items, discount, shipping, shippingAddress]);

  // ── Save & Resend ───────────────────────────────────────────────────────────
  const handleSaveAndResend = async () => {
    if (!customerEmail) return toast.error("Customer email is missing.");
    setSaving(true);
    setLiveMessage("Generating updated invoice PDF…");

    try {
      // 1. Send the updated PI email + get PDF back
      const sendRes = await fetch("/api/sendPIforManualOrders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          customerName,
          gstIn,
          shippingAddress,
          billingAddress,
          items,
          discount,
          shipping,
          otherData,
        }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.json();
        toast.error(err.message || "Failed to send invoice.");
        return;
      }

      setLiveMessage("Saving changes & downloading PDF…");

      // 2. Download the returned PDF
      const blob = await sendRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = sendRes.headers.get("Content-Disposition") ?? "";
      let filename = `${otherData.piNumber}-${customerName}.pdf`;
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      if (match) filename = decodeURIComponent(match[1] || match[2]);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);

      // 3. Persist updated PI to DB
      const updateRes = await fetch(
        `/api/saveInvoiceDetails?type=pi&piNumber=${encodeURIComponent(otherData.piNumber)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName,
            customerEmail,
            gstIn,
            shippingAddress,
            billingAddress,
            items,
            discount,
            shipping,
            otherData,
          }),
        }
      );

      if (updateRes.ok) {
        toast.success("Invoice updated and re-sent to " + customerEmail);
      } else {
        toast.success("Invoice sent. (DB update skipped — PI may not be stored yet.)");
      }
    } catch {
      toast.error("Error saving and sending invoice.");
    } finally {
      setSaving(false);
      setLiveMessage("");
    }
  };

  const inputCls =
    "w-full text-center bg-gray-50 print:bg-transparent border-2 border-blue-400 p-1 focus:ring-0 focus:outline-none text-[12px]";

  return (
    <div className="bg-white min-h-screen pt-2 pb-8 font-sans text-[13px] text-black">
      {/* Live message banner */}
      {liveMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-emerald-100 backdrop-blur-md border border-emerald-400 px-4 py-2 rounded-full shadow-lg">
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-emerald-100 rounded-full" />
              <div className="absolute w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-sm font-medium text-emerald-900 whitespace-nowrap">
              {liveMessage}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-[950px] mx-auto px-2 py-2 print:hidden flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <X className="h-4 w-4" /> Back to search
        </button>
        <span className="text-xs text-gray-500">
          Editing <span className="font-mono">{otherData.piNumber}</span>
        </span>
      </div>

      {/* Logo */}
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

      <h1 className="text-center text-[36px] font-bold py-2 uppercase tracking-tight">
        Proforma Invoice
      </h1>

      {/* PI Document */}
      <div className="max-w-[950px] mx-auto bg-white border-[1.5px] border-black mb-8">
        <div className="flex w-full">
          {/* Left Column */}
          <div className="w-[52%] border-r-[1.5px] border-black">
            <div className="flex p-3 border-b-[1.5px] border-black min-h-[140px]">
              <div className="leading-[1.3]">
                <p className="font-bold text-[16px]">Electrochem Power Systems Private Limited</p>
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
              <input
                placeholder="CUSTOMER NAME"
                className="font-bold text-[16px] uppercase w-full border-2 border-blue-400 p-1 mb-1"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                placeholder="CUSTOMER GST IN"
                className="font-bold text-[16px] uppercase w-full border-2 border-blue-400 p-1 mb-1"
                value={gstIn}
                onChange={(e) => setGstIn(e.target.value)}
              />
              <textarea
                placeholder="STREET ADDRESS"
                className="w-full border-2 border-blue-400 p-1 text-[13px] h-12"
                value={shippingAddress.street}
                onChange={(e) => handleShipping("street", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <input
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) => handleShipping("city", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="State"
                  value={shippingAddress.state}
                  onChange={(e) => handleShipping("state", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Zip Code"
                  value={shippingAddress.zipCode}
                  onChange={(e) => handleShipping("zipCode", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Phone"
                  value={shippingAddress.phone ?? ""}
                  onChange={(e) => handleShipping("phone", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
              </div>
            </div>

            <div className="p-3 border-b-[1.5px] border-black min-h-[130px]">
              <p>Buyer (Bill To)</p>
              <input
                placeholder="CUSTOMER NAME"
                className="font-bold text-[16px] uppercase w-full border-2 border-blue-400 p-1 mb-1"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <textarea
                placeholder="STREET ADDRESS"
                className="w-full border-2 border-blue-400 p-1 text-[13px] h-12"
                value={billingAddress.street}
                onChange={(e) => handleBilling("street", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <input
                  placeholder="City"
                  value={billingAddress.city}
                  onChange={(e) => handleBilling("city", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="State"
                  value={billingAddress.state}
                  onChange={(e) => handleBilling("state", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Zip Code"
                  value={billingAddress.zipCode}
                  onChange={(e) => handleBilling("zipCode", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Phone"
                  value={billingAddress.phone ?? ""}
                  onChange={(e) => handleBilling("phone", e.target.value)}
                  className="border-2 border-blue-400 p-1"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-[48%] flex flex-col">
            <div className="grid grid-cols-2 text-[12px]">
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Proforma Invoice No</p>
                <input
                  type="text"
                  value={otherData.piNumber}
                  onChange={(e) => handleOther("piNumber", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Dated</p>
                <p>{new Date(pi.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Valid Until</p>
                <input
                  type="date"
                  value={otherData.validUntil}
                  onChange={(e) => handleOther("validUntil", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Modes of Payment</p>
                <input
                  type="text"
                  value={otherData.paymentMode}
                  onChange={(e) => handleOther("paymentMode", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Supplier Reference</p>
                <input
                  type="text"
                  value={otherData.supplierReferance}
                  onChange={(e) => handleOther("supplierReferance", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Other Reference(s)</p>
                <input
                  type="text"
                  value={otherData.otherReferance}
                  onChange={(e) => handleOther("otherReferance", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Dispatch Thru</p>
                <input
                  type="text"
                  value={otherData.dispatchThru}
                  onChange={(e) => handleOther("dispatchThru", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <BankDetailsPanel />
            <div className="p-2 flex-grow min-h-[150px]">
              <p className="font-bold text-[11px] mb-1">Terms of Delivery</p>
              <textarea
                value={otherData.termOfDelivery}
                onChange={(e) => handleOther("termOfDelivery", e.target.value)}
                className="w-full h-[80%] border-2 border-blue-400 p-1"
              />
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-t-[1.5px] border-black border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-100 border-b-[1.5px] border-black font-bold text-[11px]">
              <th className="border-r-[1.5px] border-black p-2 w-[7%]">
                SI No.
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[31%] text-left px-4">
                Description of Goods
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[12%]">
                Category
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[10%]">HSN</th>
              <th className="border-r-[1.5px] border-black p-2 w-[10%]">
                Due Date
              </th>
              <th className="border-r-[1.5px] border-black p-2 w-[10%]">Qty</th>
              <th className="border-r-[1.5px] border-black p-2 w-[10%]">
                Rate
              </th>
              <th className="p-2 w-[15%] text-right pr-4">Amount</th>
              <th className="w-[5%] print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black/10">
                <td className="border-r-[1.5px] border-black p-2 text-center">{idx + 1}</td>
                <td className="border-r-[1.5px] border-black p-1 px-4">
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], productName: e.target.value };
                      setItems(next);
                    }}
                    className="w-full border-2 border-blue-400 p-1 font-bold"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <select
                    value={item.productCategory}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = {
                        ...next[idx],
                        productCategory: e.target.value as
                          | "batteries"
                          | "chargers"
                          | "others",
                      };
                      setItems(next);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-[11px]"
                  >
                    <option value="batteries">Batteries</option>
                    <option value="chargers">Chargers</option>
                    <option value="others">Others</option>
                  </select>
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="text"
                    value={item.hsn}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], hsn: e.target.value };
                      setItems(next);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], dueDate: e.target.value };
                      setItems(next);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="number"
                    value={isNaN(item.quantity) ? 0 : item.quantity}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], quantity: e.target.valueAsNumber };
                      setItems(next);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center font-bold"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="number"
                    value={isNaN(item.price) ? 0 : item.price}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], price: e.target.valueAsNumber };
                      setItems(next);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center"
                  />
                </td>
                <td className="p-2 text-right font-bold pr-4">
                  {(item.quantity * item.price).toFixed(2)}
                </td>
                <td className="print:hidden text-center">
                  <button
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-red-500 font-bold"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
            <tr className="print:hidden">
              <td colSpan={8} className="p-2 text-center">
                <button
                  onClick={() =>
                    setItems([
                      ...items,
                      {
                        productName: "",
                        productCategory: "batteries",
                        quantity: 1,
                        price: 0,
                        hsn: "8507",
                        dueDate: "",
                      },
                    ])
                  }
                  className="bg-gray-200 px-4 py-1 text-[11px] font-bold"
                >
                  + ADD ITEM
                </button>
              </td>
            </tr>
            <tr style={{ height: "120px" }}>
              <td className="border-r-[1.5px] border-black" colSpan={7} />
              <td />
              <td />
            </tr>
          </tbody>
          <tfoot className="border-t-[1.5px] border-black font-medium text-[14px]">
            <tr>
              <td colSpan={7} className="text-right p-1 px-4">Subtotal</td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">{totals.subtotal.toFixed(2)}</td>
              <td />
            </tr>
            <tr>
              <td colSpan={7} className="text-right p-1 px-4 font-bold text-gray-500">Discount</td>
              <td className="text-right p-0 border-l border-black/5">
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.valueAsNumber || 0)}
                  className="w-full text-right bg-gray-50 border-2 border-blue-400 p-1 pr-4 focus:ring-0 focus:outline-none font-bold"
                />
              </td>
              <td />
            </tr>
            <tr>
              <td colSpan={7} className="text-right p-1 px-4 font-bold text-gray-500">Shipping</td>
              <td className="text-right p-0 border-l border-black/5">
                <input
                  type="number"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.valueAsNumber || 0)}
                  className="w-full text-right bg-gray-50 border-2 border-blue-400 p-1 pr-4 focus:ring-0 focus:outline-none font-bold"
                />
              </td>
              <td />
            </tr>
            <tr>
              <td colSpan={7} className="text-right p-1 px-4">CGST</td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">{totals.cgst.toFixed(2)}</td>
              <td />
            </tr>
            <tr>
              <td colSpan={7} className="text-right p-1 px-4">SGST</td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">{totals.sgst.toFixed(2)}</td>
              <td />
            </tr>
            <tr className="border-b-[1.5px] border-black">
              <td colSpan={7} className="text-right p-1 px-4 pb-2">IGST</td>
              <td className="text-right p-1 px-4 pr-4 pb-2 border-l border-black/5">{totals.igst.toFixed(2)}</td>
              <td />
            </tr>
            <tr className="font-bold text-[18px]">
              <td colSpan={7} className="text-right p-3 px-4 uppercase">Total (in Rs)</td>
              <td className="text-right p-3 px-4 pr-4 font-black border-l border-black/5">
                ₹{totals.finalTotal.toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="max-w-[950px] mx-auto p-4 border border-blue-400 bg-blue-50 print:hidden flex items-center gap-4">
        <div className="flex-grow">
          <label className="font-bold block text-[11px] mb-1">
            CUSTOMER EMAIL (RECIPIENT)
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full p-2 border-2 border-blue-400 focus:ring-0 outline-none"
            placeholder="Enter customer email..."
          />
        </div>
        <button
          onClick={handleSaveAndResend}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 mt-4 cursor-pointer rounded font-bold uppercase hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Save &amp; Resend PI
        </button>
      </div>
    </div>
  );
}

export default function SearchInvoicePage() {
  const [pi, setPi] = useState<PIData | null>(null);
  return pi ? <PIEditor pi={pi} onBack={() => setPi(null)} /> : <SearchPanel onResult={setPi} />;
}