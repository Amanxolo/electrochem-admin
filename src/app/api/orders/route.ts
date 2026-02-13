import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { Order } from "../../../../models/order";
import { User, OrderItem } from "../../../../models/user";
import { Payment } from "../../../../models/payment";
import { Product } from "../../../../models/product";
import mongoose from "mongoose";
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const queryType: string | null = url.searchParams.get("queryType");

    switch (queryType) {
      case "orderById":
        const orderId = url.searchParams.get("id");

        if (!orderId) {
          return NextResponse.json(
            { message: "Invalid or missing Order ID" },
            { status: 400 },
          );
        }
        const singleOrder = await Order.findById(orderId)
          .populate({
            path: "user",
            model: User,
            select: "name email userType",
          })
          .populate({
            path: "payment",
            model: Payment,
            select: "amount payment_mode payment_status",
          })
          .populate({
            path: "items.product_id",
            model: Product,
            select: "productName productCategory",
          })
          .select(
            "_id user totalAmount status createdAt payment items.product_id items.quantity items.Price isEmailSent",
          );

        if (!singleOrder) {
          return NextResponse.json(
            { message: "Error finding Orders" },
            { status: 401 },
          );
        }

        return NextResponse.json(
          { allPlacedOrders: [singleOrder] },
          { status: 200 },
        );
      case "allOrders":
        const allPlacedOrders = await Order.find({
          user: { $exists: true },
          payment: { $exists: true },
        })
          .populate({
            path: "user",
            model: User,
            select: "name email userType",
          })
          .populate({
            path: "payment",
            model: Payment,
            select: "amount payment_mode payment_status",
          })
          .populate({
            path: "items.product_id",
            model: Product,
            select: "productName productCategory",
          })
          .select(
            "_id user totalAmount status createdAt payment items.product_id items.quantity items.Price isEmailSent ",
          )
          .sort({ createdAt: -1 });
        if (!allPlacedOrders) {
          return NextResponse.json(
            { message: "Error finding Orders" },
            { status: 401 },
          );
        }
        return NextResponse.json({ allPlacedOrders }, { status: 200 });
      case "forVerification":
        const allOrders = await Order.find({
          status: "not-verified",
          user: { $exists: true },
        })
          .populate({
            path: "user",
            model: User,
            select: "name email userType",
            match: { userType: { $in: ["reseller", "oem"] } },
          })
          .populate({
            path: "payment",
            model: Payment,
            select: "amount payment_mode payment_status",
          })
          .populate({
            path: "items.product_id",
            model: Product,
            select: "productName productCategory",
          })
          .select(
            "_id user totalAmount status createdAt payment items.product_id items.quantity items.Price isEmailSent ",
          );
        const orders = allOrders.filter((order) => order.user !== null);
        if (!allOrders) {
          return NextResponse.json(
            { message: "Error finding Orders" },
            { status: 401 },
          );
        }
        return NextResponse.json({ orders }, { status: 200 });
      default:
        return NextResponse.json(
          { message: "Invalid query type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryType: string | null = searchParams.get("queryType");
    await dbConnect();
    let body;
    switch (queryType) {
      case "approveOrder":
        body = await req.json();
        const { orderId, discount } = body;
        const order = await Order.findById(orderId);
        if (!order) {
          return NextResponse.json(
            { message: "Order Not Found" },
            { status: 404 },
          );
        }
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const productIDs = order.items.map(
            (item: OrderItem) => item.product_id,
          );
          const productsInDb = await Product.find({
            _id: { $in: productIDs },
          }).session(session);
          const productMap = new Map(
            productsInDb.map((p) => [p._id.toString(), p]),
          );

          const stockUpdates = [];
          for (const item of order.items) {
            const product = productMap.get(item.product_id.toString());
            if (!product) throw new Error("Product no longer exists");

            if (product.quantity < item.quantity) {
              throw new Error(
                `Insufficient stock for "${product.productName}". Current: ${product.stock}, Required: ${item.quantity}`,
              );
            }
            stockUpdates.push({
              updateOne: {
                filter: { _id: product._id },
                update: { $inc: { stock: -item.quantity } },
              },
            });
          }
          await Product.bulkWrite(stockUpdates,{session})

          const originalAmount:number=order.totalAmount
          const newTotal:number=Math.max(0,originalAmount-discount)
          order.totalAmount=newTotal
          order.status="placed"
          await order.save({session})

          await session.commitTransaction();
          return NextResponse.json({message:`Order for ${orderId} placed successfully.`},{status:201})
        } catch (err) {
            await session.abortTransaction();
          return NextResponse.json(
            {
              message: "Internal Server Error",
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 501 },
          );
        }finally{
            await session.endSession();
        }

      case "statusUpdate":
        body = await req.json();
        if (!body.orderId || !body.status) {
          return NextResponse.json(
            { message: "Parameters are missing." },
            { status: 401 },
          );
        }
        const orderbyId = await Order.findById(body.orderId);
        orderbyId.status = body.status;
        await orderbyId.save();

        return NextResponse.json(
          { message: "Order Status Updated" },
          { status: 200 },
        );
      default:
        return NextResponse.json(
          { message: "Invalid query type" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
