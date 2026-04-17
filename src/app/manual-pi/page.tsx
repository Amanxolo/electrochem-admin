"use client";
import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import BankDetailsPanel from "@/components/proforma-invoice/BankDetailsPanel";

export interface Address {
  type: "billing" | "shipping";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface IItemsWithOtherDetails {
  productId?: string;
  productName: string;
  productCategory: "batteries" | "chargers" | "others";
  quantity: number;
  price: number;
  hsn: string;
  dueDate: string;
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

const ProformaInvoice = () => {
  const router = useRouter();
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [gstIn, setgstIn] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState<Address>({
    type: "shipping",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    phone: "",
  });
  const [billingAddress, setBillingAddress] = useState<Address>({
    type: "billing",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    phone: "",
  });

  const [items, setItems] = useState<IItemsWithOtherDetails[]>([
    {
      productName: "",
      productCategory: "batteries",
      quantity: 1,
      price: 0,
      hsn: "8507",
      dueDate: "",
    },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [verifying, setVerifying] = useState(false);
  const [otherData, setOtherData] = useState<IOtherData>({
    piNumber: "",
    validUntil: "",
    paymentMode: "Bank Transfer",
    supplierReferance: "",
    otherReferance: "Standard",
    dispatchThru: "Courier",
    termOfDelivery: "",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOtherData((prev) => ({
      ...prev,
      piNumber: `PI-MAN-${Math.floor(Math.random() * 10000)}`,
    }));
  }, []);

  const totals = useMemo(() => {
    const userState = shippingAddress.state.toLowerCase().trim();
    const isUP = userState === "uttar pradesh" || userState === "up";

    let sgst = 0,
      cgst = 0,
      igst = 0,
      subtotal = 0;

    items.forEach((item) => {
      const itemSub = item.quantity * item.price;
      if (isUP) {
        const r = item.productCategory === "chargers" ? 0.025 : 0.09;
        sgst += itemSub * r;
        cgst += itemSub * r;
      } else {
        const r = item.productCategory === "chargers" ? 0.05 : 0.18;
        igst += itemSub * r;
      }
      subtotal += itemSub;
    });

    const finalTotal =
      subtotal + cgst + sgst + igst - (discount || 0) + (shipping || 0);
    return { subtotal, sgst, cgst, igst, finalTotal };
  }, [items, discount, shipping, shippingAddress.state]);
  const handleVerifyFeilds = (): boolean => {
    if (!customerEmail || !customerName || !gstIn) {
      toast.error("Please provide Customer Email and Name and GSTIN");
      return false;
    }
    if (
      shippingAddress.street.trim() === "" ||
      shippingAddress.city.trim() === "" ||
      shippingAddress.zipCode.trim() === "" ||
      shippingAddress.state.trim() === "" ||
      shippingAddress.phone.trim() === ""
    ) {
      toast.error("Please provide proper shipping Address");
      return false;
    }
    if (
      billingAddress.street.trim() === "" ||
      billingAddress.city.trim() === "" ||
      billingAddress.zipCode.trim() === "" ||
      billingAddress.state.trim() === "" ||
      billingAddress.phone.trim() === ""
    ) {
      toast.error("Please provide proper billing Address");
      return false;
    }
    if (items.length === 0) {
      toast.error("Please provide Items");
      return false;
    }

    return true;
  };
  const handleSendManualPI = async () => {
    const isOkay: boolean = handleVerifyFeilds();
    if (!isOkay) return;
    const filteredItems = items.filter((item) => Number(item.price) !== 0);
    if (filteredItems.length === 0) {
      toast.error("Please provide proper Items");
      return;
    }
    setItems(filteredItems);
    try {
      setVerifying(true);
      const res = await fetch("/api/sendPIforManualOrders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          customerName,
          gstIn,
          shippingAddress,
          billingAddress,
          items: filteredItems,
          discount,
          shipping,
          otherData,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = res.headers.get("Content-Disposition") ?? res.headers.get("content-disposition") ?? "";
          
        let filename = `PI`;
        if (contentDisposition) {
          const match = contentDisposition.match(
            /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
          );
          if (match) {
            filename = decodeURIComponent(match[1] || match[2]).replace(
              /\.pdf$/i,
              "",
            );
          }
        }
        filename += `-${customerName}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        toast.success("Invoice sent and downloaded successfully");

        // Save PI data to DB so it can be found via Search Invoice
        try {
          await fetch("/api/saveInvoiceDetails?type=pi&piNumber=" + encodeURIComponent(otherData.piNumber), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerName,
              customerEmail,
              gstIn,
              shippingAddress,
              billingAddress,
              items: filteredItems,
              discount,
              shipping,
              otherData,
            }),
          });
        } catch {
          // Non-critical — PI was already sent
        }

        router.refresh();
      }
    } catch (error) {
      toast.error("Error sending or downloading invoice email");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pt-2 pb-8 font-sans text-[13px] text-black">
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

      <div className="max-w-[950px] mx-auto bg-white border-[1.5px] border-black mb-8">
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
                onChange={(e) => setgstIn(e.target.value)}
              />
              <textarea
                placeholder="STREET ADDRESS"
                className="w-full border-2 border-blue-400 p-1 text-[13px] h-12"
                value={shippingAddress.street}
                onChange={(e) =>
                  setShippingAddress({
                    ...shippingAddress,
                    street: e.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <input
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      city: e.target.value,
                    })
                  }
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="State"
                  value={shippingAddress.state}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      state: e.target.value,
                    })
                  }
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Zip Code"
                  value={shippingAddress.zipCode}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      zipCode: e.target.value,
                    })
                  }
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Phone"
                  value={shippingAddress.phone}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      phone: e.target.value,
                    })
                  }
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
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    street: e.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-1 mt-1">
                <input
                  placeholder="City"
                  value={billingAddress.city}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      city: e.target.value,
                    })
                  }
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="State"
                  value={billingAddress.state}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      state: e.target.value,
                    })
                  }
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Zip Code"
                  value={billingAddress.zipCode}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      zipCode: e.target.value,
                    })
                  }
                  className="border-2 border-blue-400 p-1"
                />
                <input
                  placeholder="Phone"
                  value={billingAddress.phone}
                  onChange={(e) =>
                    setBillingAddress({
                      ...billingAddress,
                      phone: e.target.value,
                    })
                  }
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
                  value={otherData.piNumber}
                  onChange={(e) =>
                    setOtherData({ ...otherData, piNumber: e.target.value })
                  }
                  className="w-full border-2 border-blue-400 p-1"
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Dated</p>
                <p>{mounted ? new Date().toLocaleDateString() : ""}</p>
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Valid Until</p>
                <input
                  type="date"
                  value={otherData.validUntil}
                  onChange={(e) =>
                    setOtherData({ ...otherData, validUntil: e.target.value })
                  }
                  className="w-full border-2 border-blue-400 p-1"
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Modes of Payment</p>
                <input
                  value={otherData.paymentMode}
                  onChange={(e) =>
                    setOtherData({ ...otherData, paymentMode: e.target.value })
                  }
                  className="w-full border-2 border-blue-400 p-1"
                />
              </div>
              <div className="border-b-[1.5px] border-r-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Supplier Reference</p>
                <input
                  value={otherData.supplierReferance}
                  onChange={(e) =>
                    setOtherData({
                      ...otherData,
                      supplierReferance: e.target.value,
                    })
                  }
                  className="w-full border-2 border-blue-400 p-1"
                />
              </div>
              <div className="border-b-[1.5px] border-black p-2 min-h-[60px]">
                <p className="font-bold text-[11px]">Dispatch Thru</p>
                <input
                  value={otherData.dispatchThru}
                  onChange={(e) =>
                    setOtherData({ ...otherData, dispatchThru: e.target.value })
                  }
                  className="w-full border-2 border-blue-400 p-1"
                />
              </div>
            </div>
            <div className="p-2 flex-grow min-h-[150px]">
              <p className="font-bold text-[11px] mb-1">Terms of Delivery</p>
              <textarea
                value={otherData.termOfDelivery}
                onChange={(e) =>
                  setOtherData({ ...otherData, termOfDelivery: e.target.value })
                }
                className="w-full h-[80%] border-2 border-blue-400 p-1"
              />
            </div>
          </div>
        </div>

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
                <td className="border-r-[1.5px] border-black p-2 text-center">
                  {idx + 1}
                </td>
                <td className="border-r-[1.5px] border-black p-1 px-4">
                  <input
                    value={item.productName}
                    onChange={(e) => {
                      const n = [...items];
                      n[idx].productName = e.target.value;
                      setItems(n);
                    }}
                    className="w-full border-2 border-blue-400 p-1 font-bold"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <select
                    value={item.productCategory}
                    onChange={(e) => {
                      const n = [...items];
                      n[idx].productCategory = e.target.value as
                        | "batteries"
                        | "chargers"
                        | "others";
                      setItems(n);
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
                    value={item.hsn}
                    onChange={(e) => {
                      const n = [...items];
                      n[idx].hsn = e.target.value;
                      setItems(n);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => {
                      const n = [...items];
                      n[idx].dueDate = e.target.value;
                      setItems(n);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="number"
                    value={isNaN(item.quantity) ? 0 : item.quantity}
                    onChange={(e) => {
                      const n = [...items];
                      n[idx].quantity = e.target.valueAsNumber;
                      setItems(n);
                    }}
                    className="w-full border-2 border-blue-400 p-1 text-center font-bold"
                  />
                </td>
                <td className="border-r-[1.5px] border-black p-1">
                  <input
                    type="number"
                    value={isNaN(item.price) ? 0 : item.price}
                    onChange={(e) => {
                      const n = [...items];
                      n[idx].price = e.target.valueAsNumber;
                      setItems(n);
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
                        productId: "manual",
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
          </tbody>
          <tfoot className="border-t-[1.5px] border-black font-medium text-[14px]">
            <tr>
              <td
                rowSpan={7}
                colSpan={4}
                className="border-t-[1.5px] border-r-[1.5px] border-black p-2 align-top text-left"
              >
                <BankDetailsPanel variant="table" />
              </td>
              <td colSpan={3} className="text-right p-1 px-4">
                Subtotal
              </td>
              <td className="text-right p-1 px-4 pr-4 border-l border-black/5">
                {totals.subtotal.toFixed(2)}
              </td>
              <td className="print:hidden border-t-[1.5px] border-black" />
            </tr>
            <tr>
              <td
                colSpan={3}
                className="text-right p-1 px-4 font-bold text-gray-500"
              >
                Discount
              </td>
              <td className="text-right p-0 border-l border-black/5">
                <input
                  type="number"
                  value={isNaN(discount) ? 0 : discount}
                  onChange={(e) => setDiscount(e.target.valueAsNumber || 0)}
                  className="w-full text-right border-2 border-blue-400 p-1 pr-4 font-bold"
                />
              </td>
              <td className="print:hidden" />
            </tr>
            <tr>
              <td
                colSpan={3}
                className="text-right p-1 px-4 font-bold text-gray-500"
              >
                Shipping
              </td>
              <td className="text-right p-0 border-l border-black/5">
                <input
                  type="number"
                  value={isNaN(shipping) ? 0 : shipping}
                  onChange={(e) => setShipping(e.target.valueAsNumber || 0)}
                  className="w-full text-right border-2 border-blue-400 p-1 pr-4 font-bold"
                />
              </td>
              <td className="print:hidden" />
            </tr>
            <tr>
              <td colSpan={3} className="text-right p-1 px-4">
                CGST
              </td>
              <td className="text-right p-1  pr-4">{totals.cgst.toFixed(2)}</td>
              <td className="print:hidden" />
            </tr>
            <tr>
              <td colSpan={3} className="text-right p-1 px-4">
                SGST
              </td>
              <td className="text-right p-1 px-4 pr-4">
                {totals.sgst.toFixed(2)}
              </td>
              <td className="print:hidden" />
            </tr>
            <tr className="border-b-[1.5px] border-black">
              <td colSpan={3} className="text-right p-1 px-4">
                IGST
              </td>
              <td className="text-right p-1 px-4 pr-4">
                {totals.igst.toFixed(2)}
              </td>
              <td className="print:hidden" />
            </tr>
            <tr className="font-bold text-[18px]">
              <td colSpan={3} className="text-right p-3  uppercase">
                Total (in Rs)
              </td>
              <td className="text-right p-3 px-4 pr-4 font-black border-l border-black/5">
                ₹{totals.finalTotal.toFixed(2)}
              </td>
              <td className="print:hidden" />
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
          onClick={handleSendManualPI}
          disabled={verifying}
          className="bg-green-600 text-white px-6 py-3 mt-4 cursor-pointer rounded font-bold uppercase hover:bg-green-700 disabled:opacity-50"
        >
          {verifying ? "Sending..." : "Send  PI"}
        </button>
      </div>
    </div>
  );
};

export default ProformaInvoice;