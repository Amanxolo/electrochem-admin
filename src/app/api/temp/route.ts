import { NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { Product } from "../../../../models/product";
import { UserPrice } from "../../../../models/userprice";
import { User } from "../../../../models/user";
import bcrypt from 'bcrypt';
export async function GET(){

    await dbConnect();
    const email="xyz@gmail.com";
    const password="xyz@12234566";
    const hashedPassword=await bcrypt.hash(password,10);
    const user=await User.findOneAndUpdate({email},{
        password:hashedPassword
    },{new:true})
    if(!user){
        return NextResponse.json({message:"User not found"},{status:404})
    }
    return NextResponse.json({user},{status:200})
}