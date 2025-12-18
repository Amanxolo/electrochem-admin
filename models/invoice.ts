import mongoose, { Schema,models } from 'mongoose';

export interface invoiceProps{
    billNumber:string,
    serialNumbers:string[],
    date?:string
}


const invoiceSchema=new Schema<invoiceProps>({
 
    billNumber:{type:String,required:true},
    serialNumbers:{type:[String],required:true},
    date:{type:String}
 
},{timestamps:true})

export const Invoice = models.Invoice || mongoose.model<invoiceProps>('Invoice', invoiceSchema); 