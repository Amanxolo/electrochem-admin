import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../../models/dbconnect";
import { ManualPayments } from "../../../../../models/manualPayment";

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const body = (await req.json()) as {
      paymentId: string;
      status: "Pending" | "Approved" | "Declined";
    };

    if (!body.paymentId || !body.status) {
      return NextResponse.json(
        { message: "Missing required tracking attributes." },
        { status: 400 },
      );
    }
    const updatedPayment = await ManualPayments.findByIdAndUpdate(
      body.paymentId,
      { status: body.status },
      { new: true },
    );

    if (!updatedPayment) {
      return NextResponse.json(
        { message: "Target payment request document not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Status modified successfully.", updatedPayment },
      { status: 200 },
    );
  } catch (err) {
    
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
}
