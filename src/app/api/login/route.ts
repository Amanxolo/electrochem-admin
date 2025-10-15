import { NextRequest,NextResponse } from "next/server"
import jwt from 'jsonwebtoken'
export async function POST(req:NextRequest){
    try{
    const {email,password}=await req.json();

    if(!email || !password){
        return NextResponse.json({message:"Parameters required"},{status:400})
    }

    const admin_email=process.env.admin
    const adminPass=process.env.adminPass
    // console.log(password,adminPass)
    if(email===admin_email && password===adminPass){
        const payload={email}
        const secret=process.env.NEXTAUTH_SECRET 
        if(!secret){
        return NextResponse.json({message:"No Secret Key Provides"},{status:401})
    }
        const token = jwt.sign(payload,secret,{expiresIn:"7d"})

        return NextResponse.json({token},{status:200})
    }
    else {
        return NextResponse.json({message:"Invalid Credentials"},{status:400})
    }
}catch(error){
   if(error instanceof Error){
    return NextResponse.json({error:error.message},{status:500})
   }
   return NextResponse.json({errorMessage:"Unexpected Error Occured"},{status:500})
}

}