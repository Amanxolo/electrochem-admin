import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { User } from "../../../../models/user";
import { Notification } from "../../../../models/notification";
export async function GET(){

    try{
        await dbConnect();
        const res=await Notification.find().sort({createdAt:-1})

        if(!res){
            return NextResponse.json({message:"No notification Found."},{status:401})
        }

        return NextResponse.json(res,{status:201})
        

    }catch(error){
        return NextResponse.json({message:"Internal Server Error"},{status:501})
    }
}