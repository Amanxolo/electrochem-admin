import { NextRequest, NextResponse } from "next/server";
import {
  Payment,
  IPartialPayments,
  IPayment,
} from "../../../../models/payment";
import { dbConnect } from "../../../../models/dbconnect";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    if (!paymentId) {
      throw new Error("Payment ID is required.");
    }
    const payment: IPayment | null = await Payment.findById(paymentId)
      .select(
        "-razorpay_payment_id -razorpay_signature -partial_payments.razorpay_payment_id -partial_payments.razorpay_signature",
      )
      .lean<IPayment>();
    if (!payment) {
      return NextResponse.json(
        { message: "Payment Not Found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ payment }, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Unknown Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    if (!paymentId) throw new Error("Payment ID is required.");
    const { amount, reference, date } = (await req.json()) as {
      amount: number;
      reference?: string;
      date?: Date;
    };

    const payment: IPayment | null = await Payment.findById(paymentId);
    if (!payment)
      return NextResponse.json(
        { message: "Payment reecord not found." },
        { status: 404 },
      );
    const remainingBalance: number = payment.amount - (payment?.paidAmount || 0);
    let minAmount: number = 0.2 * payment.amount;
    if (remainingBalance < minAmount) {
      minAmount = remainingBalance;
    }
    
    if (payment.payment_status === "paid") {
      return NextResponse.json(
        { message: "This order is already fully paid." },
        { status: 400 },
      );
    }
    if (!amount || remainingBalance < amount || amount < minAmount)
      throw new Error("Valid Amount not found.");

    const paymentDetails: IPartialPayments = {
      amount,
      reference,
      payment_mode: "Cash On Delivery",
      payment_status: "paid",
      date,
    };
    const res = await Payment.findByIdAndUpdate(
      paymentId,
      {
        $push: {
          partial_payments: paymentDetails,
        },
        $inc: {
          paidAmount: amount,
        },
      },
      { new: true },
    );
    if (res?.paidAmount === res.amount) {
      await Payment.findByIdAndUpdate(
        paymentId,
        { payment_status: "paid" },
        { new: true },
      );
    }
    if (!res)
      return NextResponse.json(
        { message: "Failed to update details.Please try again" },
        { status: 401 },
      );
    return NextResponse.json(
      { message: "Payment Added Successfully" },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 501 },
    );
  }
}
