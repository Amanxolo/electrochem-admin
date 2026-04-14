import { NextRequest,NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { invoiceProps,Invoice } from "../../../../models/invoice";
import { Order } from "../../../../models/order";
import mongoose from "mongoose";

// Schema for PIs created/edited via manual-pi and search-invoice pages
const proformaInvoiceSchema = new mongoose.Schema({
    // Must match DB unique index `piNumber_1` — always set on upsert (not only nested otherData).
    piNumber: { type: String, index: true },
    customerName: String,
    customerEmail: String,
    gstIn: String,
    shippingAddress: mongoose.Schema.Types.Mixed,
    billingAddress: mongoose.Schema.Types.Mixed,
    items: [mongoose.Schema.Types.Mixed],
    discount: Number,
    shipping: Number,
    otherData: mongoose.Schema.Types.Mixed,
},{ timestamps: true })

/** Build search-invoice payload from an Order when no ProformaInvoice row exists. */
function buildPiFromOrder(
  order: Record<string, unknown>,
  user: Record<string, unknown> | null,
): Record<string, unknown> {
  const idStr = String(order._id);
  const derivedPi = `PI-${idStr.slice(-8).toUpperCase()}`;
  const items = ((order.items as unknown[]) || []).map((it: unknown) => {
    const row = it as Record<string, unknown>;
    const p = row.product_id as Record<string, unknown> | undefined;
    const cat = String(p?.productCategory ?? "batteries").toLowerCase();
    const productCategory =
      cat === "chargers" || cat === "charger"
        ? "chargers"
        : cat === "others"
          ? "others"
          : "batteries";
    return {
      productName: String(p?.productName ?? "Item"),
      productCategory,
      quantity: Number(row.quantity) || 0,
      price: Number(row.Price) ?? 0,
      hsn: "8507",
      dueDate: "",
    };
  });
  const u = user ?? {};
  return {
    _id: idStr,
    piNumber: derivedPi,
    customerName: String(u.companyName ?? u.name ?? ""),
    customerEmail: String(u.email ?? ""),
    gstIn: String((u.documents as Record<string, unknown> | undefined)?.gstin ?? ""),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    items,
    discount: 0,
    shipping: 0,
    otherData: {
      piNumber: derivedPi,
      validUntil: "",
      paymentMode: "Bank Transfer",
      supplierReferance: "",
      otherReferance: "Standard",
      dispatchThru: "Courier",
      termOfDelivery: "",
    },
    createdAt: order.createdAt
      ? new Date(order.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}


export async function POST(req:NextRequest){

    try{
        await dbConnect();
        const body=await req.json();
        const data:invoiceProps=body;
        if(!data){
            return NextResponse.json({message:"Invalid Data Provided",status:401})
        }
        // console.log(data)

        const res=await Invoice.insertOne(data)


        return NextResponse.json({message:"Data Saved Successfully",res,status:201})
        
    }catch(error){
        console.error("Error in saving Invoice Details",error)
        return NextResponse.json({message:"Internal Server Error",status:501})
    }

}

export async function GET(req:NextRequest){


    try{
        await dbConnect();
        const url=new URL(req.url)
        const type:string|null= url.searchParams.get('type')
        const billNumber:string|null=url.searchParams.get('invoiceNo')
        const serialNumber:string|null=url.searchParams.get('serialNo')
        const piNumber:string|null=url.searchParams.get('piNumber')
        if(!type){
            return NextResponse.json({message:"Valid type is required",status:401})
        }
        switch(type){
            case('invoice'):
                if(!billNumber)return NextResponse.json({message:"Valid InvoiceNo is required",status:401})
                const dataForInvoiceNumber=await Invoice.findOne({billNumber})
                return NextResponse.json({dataForInvoiceNumber,status:201})
            case('serialNo'):
                if(!serialNumber)return NextResponse.json({message:"Valid SerialNo is required",status:401})
                const dataForSerialNumber=await Invoice.findOne({serialNumbers:serialNumber})
                return NextResponse.json({dataForSerialNumber,status:201})
            case('pi'):
                if(!piNumber) return NextResponse.json({message:"Valid PI number is required"},{status:400})
                // Search the ProformaInvoice collection (stored by manual-pi / search-invoice / sendEmails)
                const ProformaInvoice = mongoose.models.ProformaInvoice || mongoose.model('ProformaInvoice', proformaInvoiceSchema)
                const normalizedPiNumber = piNumber.trim()
                const escapedPiNumber = normalizedPiNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                let pi = await ProformaInvoice.findOne({
                    $or: [
                        { piNumber: normalizedPiNumber },
                        { piNumber: normalizedPiNumber.toUpperCase() },
                        { piNumber: normalizedPiNumber.toLowerCase() },
                        { "otherData.piNumber": normalizedPiNumber },
                        { "otherData.piNumber": normalizedPiNumber.toUpperCase() },
                        { "otherData.piNumber": normalizedPiNumber.toLowerCase() },
                        { "otherData.piNumber": { $regex: `^${escapedPiNumber}$`, $options: "i" } },
                    ],
                }).lean()
                // Fallback: PI-XXXXXXXX matches last 8 hex chars of order ObjectId (order verification flow)
                if (!pi && /^PI-[0-9a-f]{8}$/i.test(normalizedPiNumber)) {
                    const suffix = normalizedPiNumber.slice(3).toLowerCase();
                    const order = await Order.findOne({
                        $expr: {
                            $eq: [
                                { $toLower: { $substrBytes: [{ $toString: "$_id" }, 16, 8] } },
                                suffix,
                            ],
                        },
                    })
                        .populate({
                            path: "user",
                            select: "name email companyName documents",
                        })
                        .populate({
                            path: "items.product_id",
                            select: "productName productCategory",
                        })
                        .lean();
                    if (order) {
                        const o = order as unknown as Record<string, unknown> & {
                            user?: Record<string, unknown> | null;
                        };
                        pi = buildPiFromOrder(o, o.user ?? null) as unknown as typeof pi;
                    }
                }
                if(!pi) return NextResponse.json({message:"No PI found with that number."},{status:404})
                return NextResponse.json({pi},{status:200})
            default:

        }
        const res=await Invoice.find();
        return NextResponse.json({res,status:201})

    }catch(error){
        console.error("Error Occured")
        return NextResponse.json({message:"Internal Server Error",status:501})
    }
}

export async function PUT(req:NextRequest){
    try{
        await dbConnect();
        const url=new URL(req.url)
        const type=url.searchParams.get('type')
        const piNumber=url.searchParams.get('piNumber')

        if(type !== 'pi' || !piNumber){
            return NextResponse.json({message:"type=pi and piNumber are required"},{status:400})
        }

        const bodyObj = (await req.json()) as Record<string, unknown>
        const ProformaInvoice = mongoose.models.ProformaInvoice || mongoose.model('ProformaInvoice', proformaInvoiceSchema)

        const q = (piNumber || "").trim()
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const existing = (await ProformaInvoice.findOne({
            $or: [
                { piNumber: q },
                { piNumber: q.toUpperCase() },
                { piNumber: q.toLowerCase() },
                { "otherData.piNumber": q },
                { "otherData.piNumber": q.toUpperCase() },
                { "otherData.piNumber": q.toLowerCase() },
                { "otherData.piNumber": { $regex: `^${escaped}$`, $options: "i" } },
            ],
        }).lean()) as { _id: mongoose.Types.ObjectId } | null

        const od = bodyObj.otherData as Record<string, unknown> | undefined
        const rootPi = String(od?.piNumber ?? q)

        const updated = await ProformaInvoice.findOneAndUpdate(
            existing
                ? { _id: existing._id }
                : {
                      $or: [{ piNumber: q }, { "otherData.piNumber": q }],
                  },
            { $set: { ...bodyObj, piNumber: rootPi } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean()

        return NextResponse.json({message:"PI saved successfully", pi: updated},{status:200})
    }catch(error){
        console.error("Error updating PI", error)
        return NextResponse.json({message:"Internal Server Error"},{status:500})
    }
}

export async function DELETE(req:NextRequest){
    await dbConnect();
    await Invoice.deleteMany({});
    return NextResponse.json({message:"All Invoices Deleted Successfully"},{status:200})
}