import { Complaint } from "../../../../models/complaint";
import { dbConnect } from "../../../../models/dbconnect";
import { NextRequest,NextResponse } from "next/server";
import { User } from "../../../../models/user";


export async function GET(req:NextRequest){

    try{
        await dbConnect();
        const url=new URL(req.url)
        const queryType:string|null=url.searchParams.get("query")
        // console.log("Query Type is ",queryType)
        if(!queryType){
            NextResponse.json({message:"Invalid query Parameters"},{status:401})
        }

        switch(queryType){
            case "getNewOrdersCount":
                const res=await Complaint.countDocuments({status:"open"});
                return NextResponse.json({totalCount:res},{status:200})
            case "getAllComplaints":
                const allComplaints=await Complaint.find().sort({createdAt:-1})
                .populate({
                    path:'userId',
                    select:'name email',
                    model:User
                })
                return NextResponse.json({complaints:allComplaints},{status:200})
            default:
                console.log("No Type matched")
        }
    }catch(error){
        console.error(error)
        return NextResponse.json({message:"Internal Server Error"},{status:501})
    }
}


export async function PUT(req:NextRequest){

    try{
        await dbConnect();
        const body=await req.json();
        const {updateType,ticketId}=body;

        switch (updateType){
            case "statusUpdate":
                const {field,value}=body;
                const updatedComplaint=await Complaint.findOneAndUpdate({ticketId},{[field]:value},{new:true});
                if(!updatedComplaint){
                    return NextResponse.json({message:"Complaint Not Found"},{status:404})
                }
                return NextResponse.json({message:"Complaint Updated Successfully"},{status:200}) 
            case "assigneeUpdate":
                const {value:assigneeValue}=body;
                const updatedComplaintAssignee=await Complaint.findOneAndUpdate(
                    {ticketId},    
                    {assignee:[assigneeValue]},
                    {new:true}
                );
                if(!updatedComplaintAssignee){
                    return NextResponse.json({message:"Complaint Not Found"},{status:404})
                }
                return NextResponse.json({message:"Complaint Updated Successfully"},{status:200}) 
            default:
                return NextResponse.json({message:"Invalid update type"},{status:400})     
        

        }
    }catch(error){
        console.error(error)
        return NextResponse.json({message:"Internal Server Error"},{status:501})
    }
}