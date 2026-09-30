import mongoose, { Schema, Document, models } from 'mongoose';
interface IManualPayments extends Document{
    orderId:mongoose.Types.ObjectId,
    userId:mongoose.Types.ObjectId,
    amount:string,
    reference?:string,
    url:string,
    status: "Pending" | "Approved" | "Declined"
}

const manualPaymentSchema=new Schema<IManualPayments>({
    orderId:{type: Schema.Types.ObjectId, ref: 'Order', required: true},
    userId:{type:Schema.Types.ObjectId,ref:'User',required:true},
    amount:{type:String},
    reference:{type:String,required:false},
    url:{type:String},
    status:{type: String, 
        enum: ["Pending" , "Approved","Declined"], 
        default: "Pending"
    }

},{
    timestamps: true
})

export const ManualPayments = models.ManualPayments || mongoose.model<IManualPayments>('ManualPayments', manualPaymentSchema); 