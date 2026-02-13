import mongoose, { Schema, Document, models, Types } from 'mongoose';

import { orderItemSchema, addressSchema, OrderItem, Address } from './user'; 

export interface IOrder extends Document {
  user: Types.ObjectId;
  payment?: Types.ObjectId;
  items: OrderItem[]; 
  totalAmount: number;
  status: 'not-verified' | 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  isEmailSent?:boolean;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  payment: {type:Schema.Types.ObjectId,ref:'Payment'},
  items: [orderItemSchema], 
  totalAmount: { type: Number, required: true },
  isEmailSent:{type:Boolean,default:false},
  status: { 
    type: String, 
    enum: ['pending','placed','processing', 'shipped', 'delivered', 'cancelled','not-verified'], 
    default: 'pending' 
  },
  shippingAddress: { type: addressSchema, required: true },
  billingAddress: { type: addressSchema, required: true },
}, { 
  timestamps: true 
});

export const Order = models.Order || mongoose.model<IOrder>('Order', orderSchema);