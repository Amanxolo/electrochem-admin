
import { NextRequest,NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { invoiceProps,Invoice } from "../../../../models/invoice";


export async function POST(req:NextRequest){

    try{
        await dbConnect();
        const body=await req.json();
        const data:invoiceProps=body;
        if(!data){
            return NextResponse.json({message:"Invalid Data Provided",status:401})
        }
        // console.log(data)

        const res=await Invoice.insertOne(data)


        return NextResponse.json({message:"Data Saved Successfully",res,status:201})
        
    }catch(error){
        console.error("Error in saving Invoice Details",error)
        return NextResponse.json({message:"Internal Server Error",status:501})
    }

}

export async function GET(req:NextRequest){


    try{
        await dbConnect();
        const url=new URL(req.url)
        const type:string|null= url.searchParams.get('type')
        const billNumber:string|null=url.searchParams.get('invoiceNo')
        const serialNumber:string|null=url.searchParams.get('serialNo')
        if(!type){
            return NextResponse.json({message:"Valid type is required",status:401})
        }
        switch(type){
            case('invoice'):
                if(!billNumber)return NextResponse.json({message:"Valid InvoiceNo is required",status:401})
                const dataForInvoiceNumber=await Invoice.findOne({billNumber})
                return NextResponse.json({dataForInvoiceNumber,status:201})
            case('serialNo'):
                if(!serialNumber)return NextResponse.json({message:"Valid SerialNo is required",status:401})
                const dataForSerialNumber=await Invoice.findOne({serialNumbers:serialNumber})
                return NextResponse.json({dataForSerialNumber,status:201})
            default:

        }
        const res=await Invoice.find();
        return NextResponse.json({res,status:201})

    }catch(error){
        console.error("Error Occured")
        return NextResponse.json({message:"Internal Server Error",status:501})
    }
}


export async function DELETE(req:NextRequest){
    await dbConnect();
    await Invoice.deleteMany({});
    return NextResponse.json({message:"All Invoices Deleted Successfully"},{status:200})
}