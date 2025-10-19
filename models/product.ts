import mongoose, { Schema, Document, models } from 'mongoose';

interface ISubProduct {
  modalNo: string;
  M_voltageRating: number;
  M_AhRating: number;
}

export interface IProduct extends Document {
  productId: string;
  productName: string;
  voltageRatings: string[];
  ahRatings: string[];
  productCategory: string;
  subprodlst: ISubProduct[];
  image: string[];
  price: number;
  minQuantity: number;
  stock:number;
  prodSpecs?: string;
}

const subProductSchema = new Schema<ISubProduct>({
  modalNo: { type: String, required: true },
  M_voltageRating: { type: Number, required: true, set: (v: string) => parseFloat(v) },
  M_AhRating: { type: Number, required: true, set: (v: string) => parseFloat(v) },
});

const productSchema = new Schema<IProduct>({
  productId: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  prodSpecs: { type: String, required: false, default: '' },
  voltageRatings: [{ type: String, required: true }],
  ahRatings: [{ type: String, required: true }],
  productCategory: { type: String, required: true },
  subprodlst: [subProductSchema],
  image: {
    type: [String],
    default: [],
    validate: {
      validator: (images: string[]) => images.every(img => typeof img === 'string'),
      message: 'Each image should be a valid string.',
    },
  },
  price: { type: Number, required: true },
  stock:{type:Number,required:true,default:0},
  minQuantity: { type: Number, required: true },
});

export const Product = models.Product || mongoose.model<IProduct>('Product', productSchema);
