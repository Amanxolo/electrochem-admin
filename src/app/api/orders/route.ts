import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { Order } from "../../../../models/order";
import { Address, User, OrderItem } from "../../../../models/user";
import { Payment, IPayment } from "../../../../models/payment";
import { Product } from "../../../../models/product";
import { Types } from "mongoose";
import { UserPrice, IUserPrice } from "../../../../models/userprice";

import mongoose from "mongoose";

export interface IPopulatedUser {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  userType: "reseller" | "oem" | "individual";
}

export interface IPopulatedPayment {
  _id: Types.ObjectId | string;
  amount: number;
  payment_mode: string;
  payment_status: string;
}
interface IProduct {
  _id: mongoose.Types.ObjectId | string;
  productName: string;
  productCategory: string;
}
interface IItems {
  product_id: IProduct;
  quantity: number;
  Price: number;
}
export interface ICustomPrice {
  product_id: mongoose.Types.ObjectId | string;
  price: number;
}
export interface IOrder {
  _id: Types.ObjectId | string;
  user: IPopulatedUser;
  totalAmount: number;
  shippingAddress: Address;
  billingAddress: Address;
  status:
    | "not-verified"
    | "pending"
    | "placed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  createdAt: string | Date;
  payment?: IPopulatedPayment;
  items: IItems[];
  isEmailSent: boolean;
}
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const queryType: string | null = url.searchParams.get("queryType");
    let orders;
    let userEmailId: string | null;
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
            select: "amount payment_mode payment_status paidAmount",
          })
          .populate({
            path: "items.product_id",
            model: Product,
            select: "productName productCategory",
          })
          .select(
            "_id user totalAmount shippingAddress billingAddress status createdAt payment items.product_id items.quantity items.Price isEmailSent",
          )
          .lean<IOrder>();

        if (!singleOrder) {
          return NextResponse.json(
            { message: "Error finding Orders" },
            { status: 401 },
          );
        }
        // console.log(singleOrder)
        const userId = singleOrder.user._id;

        const userPriceDoc = await UserPrice.findOne({
          user: userId,
        }).lean<IUserPrice>();

        const userPriceMapItem = new Map();
        if (userPriceDoc && userPriceDoc.customPrices) {
          userPriceDoc.customPrices.forEach((cp: ICustomPrice) => {
            userPriceMapItem.set(cp.product_id.toString(), cp.price);
          });
        }
        let newSubTotal: number = 0;
        let taxAmount: number = 0;

        for (const item of singleOrder.items) {
          const productId = item.product_id._id.toString();

          if (userPriceMapItem.has(productId)) {
            item.Price = userPriceMapItem.get(productId);
          }

          const lineTotal: number = item.Price * item.quantity;
          newSubTotal += lineTotal;

          const category = item.product_id.productCategory.toLowerCase().trim();

          const isCharger = category === "charger" || category === "chargers";

          // Calculate tax based on category (5% for chargers, 18% for others)
          taxAmount += isCharger ? lineTotal * 0.05 : lineTotal * 0.18;
        }

        singleOrder.totalAmount = newSubTotal + taxAmount;
        return NextResponse.json(
          { allPlacedOrders: [singleOrder] },
          { status: 200 },
        );
      case "allOrders":
        userEmailId = url.searchParams.get("emailId");

        const allOrders = await Order.find({
          user: { $exists: true },
          payment: { $exists: true },
        })
          .populate({
            path: "user",
            model: User,
            select: "name email userType",
            match: userEmailId ? { email: userEmailId } : {},
          })
          .populate({
            path: "payment",
            model: Payment,
            select: "amount payment_mode payment_status paidAmount",
          })
          .populate({
            path: "items.product_id",
            model: Product,
            select: "productName productCategory",
          })
          .select(
            "_id user totalAmount status createdAt payment items.product_id items.quantity items.Price isEmailSent shippingAddress ",
          )
          .sort({ createdAt: -1 });
        if (!allOrders) {
          return NextResponse.json(
            { message: "Error finding Orders" },
            { status: 401 },
          );
        }
        const allPlacedOrders = allOrders.filter(
          (order) => order.user !== null,
        );
        return NextResponse.json({ allPlacedOrders }, { status: 200 });
      // case "forVerification":
      //   const allOrders = await Order.find({
      //     status: "not-verified",
      //     user: { $exists: true },
      //   })
      //     .populate({
      //       path: "user",
      //       model: User,
      //       select: "name email userType",
      //       match: { userType: { $in: ["individual"] } },
      //     })
      //     .populate({
      //       path: "payment",
      //       model: Payment,
      //       select: "amount payment_mode payment_status",
      //     })
      //     .populate({
      //       path: "items.product_id",
      //       model: Product,
      //       select: "productName productCategory",
      //     })
      //     .select(
      //       "_id user shippingAddress totalAmount status createdAt payment items.product_id items.quantity items.Price isEmailSent ",
      //     );
      //   orders = allOrders.filter((order) => order.user !== null);
      //   if (!allOrders) {
      //     return NextResponse.json(
      //       { message: "Error finding Orders" },
      //       { status: 401 },
      //     );
      //   }
      //   return NextResponse.json({ orders }, { status: 200 });
      case "unVerifiedOrders":
        userEmailId = url.searchParams.get("emailId");
        const unVerifiedOrders = await Order.find({
          status: "not-verified",
          user: { $exists: true },
        })
          .populate({
            path: "user",
            model: User,
            select: "name email userType",
            match: userEmailId ? { email: userEmailId } : {},
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
            "_id user shippingAddress totalAmount status createdAt payment items.product_id items.quantity items.Price isEmailSent ",
          )
          .lean();

        orders = unVerifiedOrders.filter((order) => order.user !== null);
        if (!unVerifiedOrders) {
          return NextResponse.json(
            { message: "Error finding Orders" },
            { status: 401 },
          );
        }
        const userIds = orders.map((order) => order.user._id);
        const userPrices = await UserPrice.find({
          user: { $in: userIds },
        }).lean();
        const userPriceMap = new Map();

        for (const doc of userPrices) {
          userPriceMap.set(doc.user.toString(), doc.customPrices);
        }

        // console.log(orders);
        for (const order of orders) {
          let newSubTotal = 0;
          let taxAmount = 0;

          const customPrices = userPriceMap.get(order.user._id.toString());

          let productPriceMap: Map<string, number> | null = null;

          if (customPrices) {
            productPriceMap = new Map(
              customPrices.map((cp: ICustomPrice) => [
                cp.product_id.toString(),
                cp.price,
              ]),
            );
          }

          for (const item of order.items) {
            const productId = item.product_id._id.toString();

            // Apply custom price if exists
            if (productPriceMap && productPriceMap.has(productId)) {
              item.Price = productPriceMap.get(productId)!;
            }

            const lineTotal = item.Price * item.quantity;
            newSubTotal += lineTotal;

            const category = item.product_id.productCategory
              .toLowerCase()
              .trim();

            const isCharger = category === "charger" || category === "chargers";

            taxAmount += isCharger ? lineTotal * 0.05 : lineTotal * 0.18;
          }

          order.totalAmount = newSubTotal + taxAmount;
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
        const { orderId, discount, email } = body;
        const order = await Order.findById(orderId);
        if (!orderId || discount === undefined || !email) {
          throw new Error(
            "Missing required parameters: orderId, discount, or email",
          );
        }
        if (!order) {
          return NextResponse.json(
            { message: "Order Not Found" },
            { status: 404 },
          );
        }
        const user = await User.findOne({ email });
        if (!user) {
          return NextResponse.json(
            { message: "User Not Found" },
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
          await Product.bulkWrite(stockUpdates, { session });

          const originalAmount: number = order.totalAmount;
          const newTotal: number = Math.max(0, originalAmount - discount);
          order.totalAmount = newTotal;
          order.status = "pending";
          const paymentPayload: IPayment = {
            order: order._id as mongoose.Types.ObjectId,
            amount: newTotal,
            payment_mode: "online",
            payment_status: "pending",
          };
          const payment = new Payment(paymentPayload);
          await payment.save({ session });
          await order.save({ session });
          await User.findByIdAndUpdate(
            user._id,
            {
              $push: {
                order: order._id,
              },
            },
            { session },
          );
          // user.order.push(order._id);
          // await user.save({ session });
          await session.commitTransaction();
          return NextResponse.json(
            { message: `Order for ${orderId} placed successfully.` },
            { status: 201 },
          );
        } catch (err) {
          await session.abortTransaction();

          return NextResponse.json(
            {
              message: "Internal Server Error",
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 501 },
          );
        } finally {
          await session.endSession();
        }

      case "statusUpdate":
        body = await req.json() as { orderId: string; statustoUpdate: string ,currentStatus:string};
        if (!body.orderId || !body.statustoUpdate || !body.currentStatus) {
          return NextResponse.json(
            { message: "Parameters are missing." },
            { status: 401 },
          );
        }
        if(body.currentStatus.toLowerCase()==="cancelled"){
          return NextResponse.json(
            { message: "Cannot update status of a cancelled order." },
            { status: 400 },
          );
        }
        if(body.statustoUpdate.toLowerCase()==="cancelled"){
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
              const orderToCancel = await Order.findById(body.orderId).session(session);
              if (!orderToCancel) {
                await session.abortTransaction();
                return NextResponse.json(
                  { message: "Order Not Found" },
                  { status: 404 },
                );
              }
              if (orderToCancel.status.toLowerCase() === "cancelled") {
                await session.abortTransaction();
                return NextResponse.json(
                  { message: "Order is already cancelled." },
                  { status: 400 },
                );
              }
              const productIDs = orderToCancel.items.map(
                (item: OrderItem) => item.product_id,
              );
              const productsInDb = await Product.find({
                _id: { $in: productIDs },
              }).session(session);
              const productMap = new Map(
                productsInDb.map((p) => [p._id.toString(), p]),
              );

              const stockUpdates = [];
              for (const item of orderToCancel.items) {
                const product = productMap.get(item.product_id.toString());
                if (!product) continue; 

                stockUpdates.push({
                  updateOne: {
                    filter: { _id: product._id },
                    update: { $inc: { stock: item.quantity } },
                  },
                });
              }
              if (stockUpdates.length > 0) {
                await Product.bulkWrite(stockUpdates, { session });
              }

              orderToCancel.status = "cancelled";
              await orderToCancel.save({ session });
              await session.commitTransaction();
              return NextResponse.json(
                { message: "Order Cancelled and stock updated successfully." },
                { status: 200 },
              );
            }catch(err){
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
          }
        const orderbyId = await Order.findById(body.orderId);
        orderbyId.status = body.statustoUpdate;
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
    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Internal Server Error", error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
