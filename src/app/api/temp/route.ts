import { NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { Product } from "../../../../models/product";
import { UserPrice } from "../../../../models/userprice";
export async function GET(){

    await dbConnect();
    const products=await UserPrice.find();

    return NextResponse.json({products},{status:200})
}