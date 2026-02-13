import { NextResponse } from "next/server";
import { Resend } from "resend";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { dbConnect } from "../../../../models/dbconnect";
import { User } from "../../../../models/user";
import { Order } from "../../../../models/order";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface CartItemInput {
  id?: string;
  productName: string;
  quantity: number;
  price: number;
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = (await req.json()) as {
      items: CartItemInput[];
      email: string;
      orderId: string;
    };

    const { items, email, orderId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: "Cart is empty. Cannot generate invoice." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { message: "Customer email is required." },
        { status: 400 }
      );
    }
    if(!orderId){
      return NextResponse.json(
        { message: "Order ID is required to link the invoice." },
        { status: 400 }
      );
    }
    const user = await User.findOne({ email });
    const order = await Order.findById(orderId);
    if(!order){
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { message: "User not found for the provided email." },
        { status: 404 }
      );
    }

    // Prepare line items for invoice
    const processedItems = items.map((item) => ({
      productName: item.productName || "Item",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 0,
      totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1),
    }));

    // Calculate totals (same tax structure as template: CGST + SGST)
    const subtotal = order.totalAmount || 0;
    const taxRate = 18; // 18% total GST
    const cgstRate = taxRate / 2; // 9%
    const sgstRate = taxRate / 2; // 9%
    const cgstAmount = (subtotal * cgstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const discount = order?.discount || 0;
    const totalAmount = subtotal + cgstAmount + sgstAmount - discount;

    // Generate PI number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const piNumber = `PI-${year}${month}-${random}`;

    // Load HTML template
    let templatePath = path.join(
      process.cwd(),
      "templates",
      "proforma-invoice.html"
    );
    if (!fs.existsSync(templatePath)) {
      // Fallback if project root differs
      templatePath = path.resolve(
        process.cwd(),
        "electrochem-store",
        "templates",
        "proforma-invoice.html"
      );
    }

    if (!fs.existsSync(templatePath)) {
      console.error("Template not found at", templatePath);
      return NextResponse.json(
        { message: "Invoice template file not found." },
        { status: 500 }
      );
    }

    const template = fs.readFileSync(templatePath, "utf8");

    // Load logo as data URL (fallback to empty if missing)
    const logoPath = path.join(process.cwd(), "public", "images", "ELECTROCHEM-LOGO-1 (1).svg");
    let logoDataUrl = "";
    if (fs.existsSync(logoPath)) {
      const logoContent = fs.readFileSync(logoPath, "utf8");
      logoDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(logoContent)}`;
    }

    // Build items rows HTML
    const validUntil = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toLocaleDateString();

    const itemsHtml = processedItems
      .map(
        (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.productName}</td>
        <td>39173290</td>
        <td>${validUntil}</td>
        <td class="text-right font-bold">${item.quantity} PCS</td>
        <td class="text-right">${item.unitPrice.toFixed(2)}</td>
        <td>PCS</td>
        <td class="text-right font-bold">${item.totalPrice.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    // Extract address info from user
    const primaryAddress = user.addresses?.[0];

    const customerName = user.name || "Valued Customer";
    const customerAddress =
      primaryAddress &&
      `${primaryAddress.street}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zipCode}, ${primaryAddress.country}`;
    const customerPhone = primaryAddress?.phone || "";
    const customerGSTIN = user.documents?.gstin || "GSTIN not provided";
    const customerState = primaryAddress?.state || "State not provided";

    // Simple variable replacement in template
    const html = template
      .replace(/{{logoUrl}}/g, logoDataUrl)
      .replace(/{{piNumber}}/g, piNumber)
      .replace(/{{issueDate}}/g, now.toLocaleDateString())
      .replace(/{{validUntil}}/g, validUntil)
      .replace(/{{customerName}}/g, customerName)
      .replace(/{{customerAddress}}/g, customerAddress || "Address not provided")
      .replace(/{{customerPhone}}/g, customerPhone || "Phone not provided")
      .replace(/{{customerGSTIN}}/g, customerGSTIN)
      .replace(/{{customerState}}/g, customerState)
      .replace(/{{subtotal}}/g, subtotal.toFixed(2))
      .replace(/{{discount}}/g, discount.toFixed(2))
      .replace(/{{cgstRate}}/g, cgstRate.toFixed(0))
      .replace(/{{cgstAmount}}/g, cgstAmount.toFixed(2))
      .replace(/{{sgstRate}}/g, sgstRate.toFixed(0))
      .replace(/{{sgstAmount}}/g, sgstAmount.toFixed(2))
      .replace(/{{totalAmount}}/g, totalAmount.toFixed(2))
      .replace(/{{notes}}/g, "")
      .replace(/{{items}}/g, itemsHtml);

    // Generate PDF in memory using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await browser.close();

    // Send email with PDF attachment via Resend using the generated buffer
    const { data: emailResult, error } = await resend.emails.send({
      from: "sales@electrochembattery.com",
      to: email,
      subject: `Proforma Invoice ${piNumber} - ElectroChem`,
      html: `<p>Dear ${customerName},</p>
             <p>Thank you for your order. Please find attached the Proforma Invoice <strong>${piNumber}</strong>.</p>
             <p>Best regards,<br/>ElectroChem Power</p>`,
      attachments: [
        {
          // Send the in-memory buffer directly as a Node Buffer
          content: Buffer.from(pdfBuffer),
          filename: `${piNumber}.pdf`,
        },
      ],
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json(
        { message: "Failed to send invoice email." },
        { status: 502 }
      );
    }

    // Mark order as placed if orderId provided
    if (orderId) {
      try {
        await Order.findByIdAndUpdate(orderId, { isEmailSent: true });
      } catch (e) {
        console.error("Failed to update order status to placed:", e);
      }
    }

    return NextResponse.json(
      {
        message: "Invoice email sent successfully.",
        data: emailResult,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error generating or sending invoice:", err);
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 }
    );
  }
}
