import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../../models/dbconnect";
import { ManualPayments } from "../../../../../models/manualPayment";
import { User } from "../../../../../models/user";
import { Order } from "../../../../../models/order";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const requests = await ManualPayments.find({
       
    })
      .populate([
        {
          path: "userId",
          model: User,
          select: "name email phone companyName",
        },
        {
          path: "orderId",
          model: Order,
          select: "totalAmount createdAt items",
        },
      ])
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests }, { status: 200 });
  } catch (err) {
    console.error("Error in fetching Manual payments Requests", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
