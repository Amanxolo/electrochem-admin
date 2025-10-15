import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { User } from "../../../../models/user";

export async function GET(){

    try{
        await dbConnect();
        const totalUsers=await User.countDocuments({})
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newUsers=await User.countDocuments({
            createdAt:{$gte:thirtyDaysAgo}
        })
        const previousUser=await User.countDocuments({
            createdAt:{$lt:thirtyDaysAgo}
        })
        return NextResponse.json({totalUsers,newUsers,previousUser},{status:200})
    }catch(error){
        if(error instanceof Error){
            return NextResponse.json({Error:error},{status:500})
        }

        return NextResponse.json({Error:"Unexpected Error Occured"},{status:500})
    }


}