import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../../models/dbconnect";
import { Order } from "../../../../../models/order";
import mongoose from "mongoose";
import { OrderItem, User } from "../../../../../models/user";
import { Product } from "../../../../../models/product";
import { UserPrice } from "../../../../../models/userprice";
import { ICustomprice } from "../../../../../models/userprice";
import { IPayment, Payment } from "../../../../../models/payment";
import { IItemsWithOtherDetails } from "@/app/unVerifiedOrders/[id]/page";

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { orderId, discount, shipping, updatedItems, email } = body as {
      orderId: string;
      discount: number;
      shipping: number;
      updatedItems: IItemsWithOtherDetails[];
      email: string;
    };
    const [order, user] = await Promise.all([
      Order.findById(orderId),
      User.findOne({ email }),
    ]);

    if (!order) {
      return NextResponse.json({ message: "Order Not Found" }, { status: 404 });
    }
    if(order.status!=="not-verified"){
      return NextResponse.json({message:"Order already Verified."},{status:401})
    }
    if (!user) {
      return NextResponse.json({ message: "User Not Found" }, { status: 404 });
    }
    // console.log(updatedItems);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const productIDs = order.items.map((item: OrderItem) => item.product_id);
      const productsInDb = await Product.find({
        _id: { $in: productIDs },
      }).session(session);
      const productMap = new Map(
        productsInDb.map((p) => [p._id.toString(), p]),
      );

      const stockUpdates = [];
      for (const item of updatedItems) {
        const productId = item.productId.toString();
        if (!productId) throw new Error("Product ID not found.");
        const product = productMap.get(productId);
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

      order.items = order.items.map((item: OrderItem) => {
        const updatedItem = updatedItems.find(
          (ui: IItemsWithOtherDetails) =>
            ui.productId.toString() === item.product_id.toString(),
        );
        if (updatedItem) {
          item.quantity = updatedItem.quantity;
          item.Price = updatedItem.price;
        }
        return item;
      });
      let subTotalAmount: number = 0;
      let taxAmount: number = 0;
      updatedItems.forEach((item) => {
        subTotalAmount += item.price * item.quantity;
        if (
          item.productCategory.toLowerCase().trim() === "charger" ||
          item.productCategory.toLowerCase().trim() === "chargers"
        ) {
          taxAmount += 0.05 * item.price * item.quantity;
        } else taxAmount += 0.18 * item.price * item.quantity;
      });

      let newTotalAmount: number = subTotalAmount + taxAmount;

      newTotalAmount = Math.max(0, newTotalAmount - discount + shipping);
      order.totalAmount = newTotalAmount;
      order.status = "pending";
      const paymentPayload: IPayment = {
        order: order._id as mongoose.Types.ObjectId,
        amount: newTotalAmount,
        payment_mode: "online",
        payment_status: "pending",
      };
      const payment = new Payment(paymentPayload);
      await payment.save({ session });

      order.payment = payment._id;
      await order.save({ session });
      // user.order.push(order._id)
      // await user.save({session})

      await User.updateOne(
        { _id: user._id },
        { $push: { order: order._id } },
        { session, runValidators: false },
      );

      for (const item of order.items) {
        const userPriceDoc = await UserPrice.findOneAndUpdate(
          { user: order.user },
          { $setOnInsert: { user: order.user, customPrices: [] } },
          { upsert: true, new: true, session },
        );

        const hasProduct = userPriceDoc.customPrices.some((cp: ICustomprice) =>
          cp.product_id.equals(item.product_id._id),
        );
        if (hasProduct) {
          await UserPrice.updateOne(
            {
              user: order.user,
              "customPrices.product_id": item.product_id._id,
            },
            { $set: { "customPrices.$.price": item.Price } },
            { session },
          );
        } else {
          await UserPrice.updateOne(
            { user: order.user },
            {
              $push: {
                customPrices: {
                  product_id: item.product_id._id,
                  price: item.Price,
                },
              },
            },
            { session },
          );
        }
      }

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
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { message: "Internal Server Error." },
      { status: 500 },
    );
  }
}