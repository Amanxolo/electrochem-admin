import mongoose, { Schema, Document, Types } from 'mongoose'

// Address Sub-Schema
const addressSchema = new Schema({
  type: { type: String, enum: ['billing', 'shipping'], required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: false },
})

// OrderItem Sub-Schema
const orderItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 0 },
  Ah_Rating_Selected: { type: Number, default: 0 },
  Voltage_Rating_Selected: { type: Number, default: 0 },
  Kw_Rating: { type: Number, default: 0 },
  Price: { type: Number, required: true, default: 0 },
})

// Document Uploads Sub-Schema
const documentUploadSchema = new Schema({
  aadhar: { type: String, required: true },
  pan: { type: String, required: true },
  
  gstin: { type: String, required: false },
})

export interface OrderItem {
  product_id: Types.ObjectId
  quantity: number
  Ah_Rating_Selected?: number
  Voltage_Rating_Selected?: number
  Kw_Rating?: number
  Price: number
}

export interface Address {
  type: 'billing' | 'shipping'
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
}

export interface DocumentUpload {
  aadhar:string,
  pan:string,
  // panOrAadhar?: string
  gstin?: string
}

export interface IUser extends Document {
  name: string
  email: string
  password: string
  addresses: Address[]
  order: OrderItem[]
  documents?: DocumentUpload
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  addresses: { type: [addressSchema], default: [] },
  order: { type: [orderItemSchema], default: [] },
  documents: { type: documentUploadSchema, default: {} ,required:true},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

userSchema.pre<IUser>('save', function (next) {
  this.updatedAt = new Date()
  next()
})

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema)
