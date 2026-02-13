import mongoose, { Schema, Document, models } from 'mongoose';

interface assignee {
    name: string;
    email: string;
}
export interface message{
    role: 'user' | 'support';
    content: string;
    timestamp: Date;
}
interface complaintProps extends Document {
    userId: mongoose.Types.ObjectId;
    ticketId: string;
    category: string;
    invoice: string;
    serialnumber: string;
    description: string;
    images?: string[];
    status: 'open' | 'in progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high';
    assignee?: assignee[];
    messages?: message[];
    feedback?:{
        rating:number,
        feedback:string
    }


}

const complaintSchema = new Schema<complaintProps>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    invoice: { type: String,required:true },
    serialnumber: { type: String,required:true },
    description: { type: String, required: true },
    images: { type: [String] },
    status: { 
        type: String, 
        enum: ['open', 'in progress', 'resolved', 'closed'], 
        default: 'open' 
    },
    priority: {
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'low'
    },
    assignee: [{
        name: { type: String },
        email: { type: String }
    }],
    messages: [{
        role: { type: String, enum: ['user', 'support'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]

},{
    timestamps: true
});

export const Complaint = models.Complaint || mongoose.model<complaintProps>('Complaint', complaintSchema);  