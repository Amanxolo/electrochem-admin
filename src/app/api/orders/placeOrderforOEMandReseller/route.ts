import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../../models/dbconnect";
import { Order } from "../../../../../models/order";
import mongoose from "mongoose";
import { OrderItem ,User} from "../../../../../models/user";
import { Product } from "../../../../../models/product";
import { UserPrice } from "../../../../../models/userprice";
import { ICustomprice } from "../../../../../models/userprice";
import { IPayment,Payment } from "../../../../../models/payment";
interface IItems {
  product_id: {
    _id: string;
    productName: string;
    productCategory: string;
  };
  quantity: number;
  Price: number;
}
interface IUser{
    email:string,
    order: mongoose.Types.ObjectId[]
}
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { orderId, discount, updatedItems ,email} = body as {
      orderId: string;
      discount: number;
      updatedItems: IItems[];
      email:string
    };
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ message: "Order Not Found" }, { status: 404 });
    }
    const user=await User.findOne({email})
    if(!user){
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

      order.items = order.items.map((item: OrderItem) => {
        const updatedItem = updatedItems.find(
          (ui: IItems) =>
            ui.product_id._id.toString() === item.product_id.toString(),
        );
        if (updatedItem) {
          item.Price = updatedItem.Price;
        }
        return item;
      });
      let subTotalAmount: number = 0;
      let taxAmount: number = 0;
      updatedItems.forEach((item) => {
        subTotalAmount += item.Price * item.quantity;
        if (
          item.product_id.productCategory.toLowerCase().trim() === "charger" ||
          item.product_id.productCategory.toLowerCase().trim() === "chargers"
        ) {
          taxAmount += 0.05 * item.Price * item.quantity;
        } else taxAmount += 0.18 * item.Price * item.quantity;
      });

      let newTotalAmount: number = subTotalAmount + taxAmount;

      newTotalAmount = Math.max(0, newTotalAmount - discount);
      order.totalAmount = newTotalAmount;
      order.status = "pending";
      const paymentPayload: IPayment = {
        order: order._id as mongoose.Types.ObjectId,
        amount: newTotalAmount,
        payment_mode: "online",
        payment_status: "pending",
      };
      const payment=new Payment(paymentPayload)
      await payment.save({session})

      order.payment=payment._id
      await order.save({ session });
      // user.order.push(order._id)
      // await user.save({session})

      await User.updateOne(
        { _id: user._id },
        { $push: { order: order._id } },
        { session, 
          runValidators:false
        },
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
