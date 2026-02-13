import { NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { Product } from "../../../../models/product";
export async function GET(){

    await dbConnect();
    const products=await Product.find({price:4});

    return NextResponse.json({products},{status:200})
}