import { dbConnect,uploadToGridFS } from "../../../../models/dbconnect";
import { NextRequest,NextResponse } from "next/server";



export async function POST(req:NextRequest){

    try{
        await dbConnect();
        const body=await req.formData();
        const aadharFile=body.get("aadhar") as File;
        const panFile=body.get("pan") as File;
        const gstinFile=body.get("gstin") as File | null;   
        if(!aadharFile || !panFile){
            return NextResponse.json({error:"Aadhar and PAN are required"},{status:400});
        }
        const [aadharUrl,panUrl,gstinUrl]=await Promise.all([
            uploadToGridFS(aadharFile),
            uploadToGridFS(panFile),
            gstinFile ? uploadToGridFS(gstinFile) : Promise.resolve(null)
        ]);
        return NextResponse.json({aadharUrl,panUrl,gstinUrl},{status:200}); 
    }catch(err){
        console.error("Get URL error:",err);
        return NextResponse.json({error:"Get URL failed"},{status:500});
    }

}