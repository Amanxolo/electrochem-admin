import { NextResponse } from "next/server";
import { Resend } from "resend";
import chromium from "@sparticuz/chromium";
import type { PuppeteerNode, Browser } from "puppeteer-core";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { dbConnect } from "../../../../models/dbconnect";

import {
  Address,
  IOtherData,
  IItemsWithOtherDetails,
} from "@/app/manual-pi/page";
let puppeteer: PuppeteerNode;
const isProduction = process.env.NODE_ENV === "production";

// Asset paths
const templatePath = path.join(
  process.cwd(),
  "templates",
  "proforma-invoice.html",
);
const logoPath = path.join(
  process.cwd(),
  "public",
  "images",
  "ElectrochemLogo.svg",
);

// Module caching
let cachedTemplate: string | null = null;
let cachedLogo: string | null = null;

const proformaInvoiceSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true },
);

if (isProduction) {
  const mod = await import("puppeteer-core");
  puppeteer = mod.default;
} else {
  const mod = await import("puppeteer");
  puppeteer = (mod as unknown as { default: PuppeteerNode }).default;
}

export async function POST(req: Request) {
  let browser: Browser | null = null;

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { message: "RESEND_API_KEY missing." },
        { status: 500 },
      );
    }

    const resend = new Resend(resendApiKey);
    await dbConnect();

    const body = (await req.json()) as {
      items: IItemsWithOtherDetails[];
      email: string;
      customerName: string;
      shippingAddress: Address;
      billingAddress: Address;
      gstIn: string;
      discount: number;
      shipping: number;
      otherData: IOtherData;
    };

    const {
      items,
      gstIn,
      email,
      customerName,
      discount,
      shipping,
      otherData,
      shippingAddress,
      billingAddress,
    } = body;

    if (!otherData?.piNumber || String(otherData.piNumber).trim() === "") {
      return NextResponse.json(
        { message: "PI number (otherData.piNumber) is required." },
        { status: 400 },
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: "Cart is empty. Cannot generate invoice." },
        { status: 400 },
      );
    }

    if (!fs.existsSync(templatePath) || !fs.existsSync(logoPath)) {
      throw new Error("Required template or logo files are missing.");
    }
    if (!cachedTemplate) {
      cachedTemplate = fs.readFileSync(templatePath, "utf8");
    }
    if (!cachedLogo && fs.existsSync(logoPath)) {
      const logoContent = fs.readFileSync(logoPath, "utf8");
      cachedLogo = `data:image/svg+xml;utf8,${encodeURIComponent(logoContent)}`;
    }

    // 3. GST & Tax Logic
    const primaryAddress = shippingAddress;
    
    const userState = primaryAddress?.state?.toLowerCase().trim() || "";
    const isUP = userState === "uttar pradesh" || userState === "up";

    let sgst: number = 0,
      cgst: number = 0,
      igst: number = 0,
      subtotal: number = 0;

    for (const item of items) {
      const itemSubtotal: number = item.quantity * item.price;
      const isCharger = ["charger", "chargers"].includes(
        item.productCategory.toLowerCase().trim(),
      );

      if (isUP) {
        const rate = isCharger ? 0.025 : 0.09;
        sgst += itemSubtotal * rate;
        cgst += itemSubtotal * rate;
      } else {
        const rate = isCharger ? 0.05 : 0.18;
        igst += itemSubtotal * rate;
      }
      subtotal += itemSubtotal;
    }

    const totalAmount =
      subtotal + cgst + sgst + igst - (discount || 0) + (shipping || 0);

    const now = new Date();
    const piNumber = otherData.piNumber;
    const validUntil = otherData.validUntil;
    const processedItems = items.map((item) => ({
      productName: item.productName || "Item",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 0,
      totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1),
      hsn: item.hsn,
      dueDate: item.dueDate,
    }));
    const itemsHtml = processedItems
      .map(
        (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.productName}</td>
        <td>${item.hsn}</td> <td>${item.dueDate}</td>
        <td class="text-right font-bold">${item.quantity} PCS</td>
        <td class="text-right">${item.unitPrice.toFixed(2)}</td>
        <td>PCS</td>
        <td class="text-right font-bold">${(item.unitPrice * item.quantity).toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const html = cachedTemplate!
      .replace(/{{logoUrl}}/g, cachedLogo || "")
      .replace(/{{piNumber}}/g, piNumber)
      .replace(/{{issueDate}}/g, now.toLocaleDateString())
      .replace(/{{validUntil}}/g, validUntil)
      .replace(/{{suplierRef}}/g, otherData.supplierReferance)
      .replace(/{{notes}}/g, otherData.otherReferance)
      .replace(/{{paymentMode}}/g, otherData.paymentMode)
      .replace(/{{dispatch}}/g, otherData.dispatchThru)
      .replace(/{{termsOfDelivery}}/g, otherData.termOfDelivery)
      .replace(/{{customerName}}/g, customerName || "Valued Customer")
      .replace(
        /{{customerAddress}}/g,
        `${primaryAddress?.street}, ${primaryAddress?.city}, ${primaryAddress?.state}`,
      )
      .replace(
        /{{billingAddress}}/g,
        `${billingAddress?.street}, ${billingAddress?.city}, ${billingAddress?.state}`,
      )
      .replace(/{{customerPhone}}/g, primaryAddress?.phone || "N/A")
      .replace(/{{billingPhone}}/g, billingAddress?.phone || "N/A")
      .replace(/{{customerGSTIN}}/g, gstIn || "URD")
      .replace(/{{customerState}}/g, primaryAddress?.state || "N/A")
      .replace(/{{billingState}}/g, billingAddress?.state || "N/A")
      .replace(/{{subtotal}}/g, subtotal.toFixed(2))
      .replace(/{{discount}}/g, (discount || 0).toFixed(2))
      .replace(/{{shipping}}/g, (shipping || 0).toFixed(2))
      .replace(/{{cgstAmount}}/g, cgst.toFixed(2))
      .replace(/{{sgstAmount}}/g, sgst.toFixed(2))
      .replace(/{{igstAmount}}/g, igst.toFixed(2))
      .replace(/{{totalAmount}}/g, totalAmount.toFixed(2))
      .replace(/{{items}}/g, itemsHtml);

    // 5. PDF Generation
    const binPath = path.join(
      process.cwd(),
      "node_modules/@sparticuz/chromium/bin",
    );
    browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: isProduction
        ? await chromium.executablePath(binPath)
        : undefined,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    const ProformaInvoice =
      mongoose.models.ProformaInvoice ||
      mongoose.model("ProformaInvoice", proformaInvoiceSchema);

    await ProformaInvoice.findOneAndUpdate(
      {
        $or: [{ piNumber }, { "otherData.piNumber": piNumber }],
      },
      {
        $set: {
          piNumber,
          customerName,
          customerEmail: email,
          gstIn,
          shippingAddress,
          billingAddress,
          items,
          discount: discount || 0,
          shipping: shipping || 0,
          otherData,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // 6. Send Email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "sales@electrochembattery.com",
      to: email,
      subject: `Proforma Invoice ${piNumber} - ElectroChem Power Systems`,
      html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Dear <strong>${customerName}</strong>,</p>
            
            <p>Please find attached Proforma Invoice <strong>${piNumber}</strong> regarding your recent order.</p>
            
          
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              <p style="margin: 0;">Best Regards,</p>
              
              <p style="margin: 0; font-weight: bold;">Electrochem Power Systems Private Limited</p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                Building No. 49, First Floor, Block-A, Sector 57, Gautam Buddha Nagar<br />
                Noida, Uttar Pradesh - 201301
              </p>
            </div>
          </div>
  `,
      attachments: [
        { content: Buffer.from(pdfBuffer), filename: `${piNumber}.pdf` },
      ],
    });

    if (emailError) {
      console.error("Resend API Error:", emailError);
      return NextResponse.json(
        { message: "Failed to send invoice email." },
        { status: 502 },
      );
    }

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${piNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Invoice Error:", err);
    let errorMessage: string = "Internal Server Error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
