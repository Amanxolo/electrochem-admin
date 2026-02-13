import mongoose from "mongoose"
import { Schema ,models} from "mongoose"

export interface INotification{

    userEmail:string,
    type:'BULK_ORDER_ENQUIRY'
}

const notificationSchema = new Schema({
    userEmail:{type:String,required:true},
    type:{type:String,enum:['BULK_ORDER_ENQUIRY']}
},{
    timestamps:true
})

export const Notification = models.Notification || mongoose.model<INotification>('Notification', notificationSchema);