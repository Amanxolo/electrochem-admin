import { Types } from "mongoose";
import mongoose from "mongoose";

export interface ICustomprice {
  product_id: Types.ObjectId;
  price: number;
}
interface IUserPrice {
  user: Types.ObjectId;
  customPrices: ICustomprice[];
}

const userPriceSchema = new mongoose.Schema<IUserPrice>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref:'User',required: true, unique: true,index: true },
    customPrices: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        price: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

export const UserPrice =
  mongoose.models.UserPrice ||
  mongoose.model<IUserPrice>("UserPrice", userPriceSchema);
