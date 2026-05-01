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
interface ServiceReportUpdatedBy {
    name: string;
    email: string;
}
interface ServiceReport {
    natureOfProblem: string;
    solutionImplemented: string;
    furtherInterventionRequired: boolean;
    interventionDetails?: string;
    escalationRequired: boolean;
    escalationDetails?: string;
    finalResolutionSummary: string;
    serviceDate: Date;
    updatedBy: ServiceReportUpdatedBy;
    customerSatisfied?: boolean;
    customerRemarks?: string;
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
    };
    serviceReport?: ServiceReport;


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
    }],
    serviceReport: {
        natureOfProblem: { type: String },
        solutionImplemented: { type: String },
        furtherInterventionRequired: { type: Boolean, default: false },
        interventionDetails: { type: String },
        escalationRequired: { type: Boolean, default: false },
        escalationDetails: { type: String },
        finalResolutionSummary: { type: String },
        serviceDate: { type: Date },
        updatedBy: {
            name: { type: String },
            email: { type: String }
        },
        customerSatisfied: { type: Boolean },
        customerRemarks: { type: String }
    }

},{
    timestamps: true
});

export const Complaint = models.Complaint || mongoose.model<complaintProps>('Complaint', complaintSchema);  