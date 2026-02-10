import mongoose,{ models, Schema } from "mongoose"


export interface IPayment{
    order: mongoose.Types.ObjectId,
    amount:number,
    payment_mode:string,
    razorpay_order_id?:string,
    razorpay_payment_id?:string,
    razorpay_signature?:string
    payment_status:string
}

export const paymentSchema=new Schema<IPayment>({
    order:{type:Schema.Types.ObjectId,ref:'Order',required:true},
    amount:{type:Number,required:true},
    payment_mode:{type:String,enum:["online","Cash On Delivery"],default:"online",required:true},
    razorpay_order_id:{type:String,index:true},
    razorpay_payment_id:String,
    razorpay_signature:String,
    payment_status:{type:String,enum:["pending","verified","paid","refunded","failed"],
        default:"pending",required:true}
},{
    timestamps:true
})

export const Payment=models.Payment || mongoose.model<IPayment>('Payment',paymentSchema)