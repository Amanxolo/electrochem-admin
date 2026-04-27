import mongoose,{ models, Schema } from "mongoose"


export interface IPartialPayments{
    payment_mode:string,
    amount:number,
    razorpay_order_id?:string,
    razorpay_payment_id?:string,
    razorpay_signature?:string,
    reference?:string,
    date?:Date
    payment_status:string,
}
export interface IPayment{
    
    order: mongoose.Types.ObjectId,
    amount:number,
    paidAmount?:number,
    partial_payments?:IPartialPayments[],
    payment_mode:string,
    razorpay_order_id?:string,
    razorpay_payment_id?:string,
    razorpay_signature?:string,
    payment_status:string,
    
}

export const partialPaymentSchema=new Schema<IPartialPayments>({
    payment_mode:{type:String,enum:["online","Cash On Delivery"],default:"online",required:true},
    amount:{type:Number,required:true},
    razorpay_order_id:{type:String,index:true},
    razorpay_payment_id:String,
    razorpay_signature:String,
    reference:String,
    date:Date,
    payment_status:{type:String,enum:["pending","verified","paid","refunded","failed"],
        default:"pending",required:true}
},{
    timestamps:true,
})
export const paymentSchema=new Schema<IPayment>({
    order:{type:Schema.Types.ObjectId,ref:'Order',required:true},
    amount:{type:Number,required:true},
    payment_mode:{type:String,enum:["online","Cash On Delivery"],default:"online",required:true},
    razorpay_order_id: { type: String, index: true }, 
    razorpay_payment_id: String,
    razorpay_signature: String,
    partial_payments:{type:[partialPaymentSchema],required:false},
    paidAmount:{type:Number,default:0},
    payment_status:{type:String,enum:["pending","verified","paid","refunded","failed"],
        default:"pending",required:true}
},{
    timestamps:true
})

export const Payment=models.Payment || mongoose.model<IPayment>('Payment',paymentSchema)