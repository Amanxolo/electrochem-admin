// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCaller } from "../../../../trpc/server";
import { dbConnect, uploadToGridFS } from "../../../../models/dbconnect";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
interface FileRef {
  _id:string | {toString():string}
}
export async function POST(req: NextRequest) {
  try {
    // ensure DB connection
    await dbConnect();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Optional: derive filename/content type
    const filename = (file).name || `upload-${Date.now()}`;
    const contentType = file.type || "application/octet-stream";

    // Try using your helper first (if it accepts the Web File or buffer)
    let fileUrl: string | null = null;
    try {
      // If your uploadToGridFS accepts a File or Buffer, it should return
      // either the saved file id or a path/url. Adjust if your helper expects different args.
      const helperResult: string | FileRef= await uploadToGridFS(file);
      if (helperResult) {
        // normalize to a /api/files/<id> url if helper returns only an id
        if (typeof helperResult === "string") {
          // if it's already a URL, accept it; otherwise convert id -> /api/files/<id>
          fileUrl = helperResult.startsWith("/") || helperResult.startsWith("http")
            ? helperResult
            : `/api/files/${helperResult}`;
        } else if (helperResult && ("_id" in helperResult)) {
          fileUrl = `/api/files/${(helperResult as FileRef)._id.toString()}`;
        } else {
          fileUrl = String(helperResult);
        }
      } else {
        // treat as failure -> fallback
        throw new Error("uploadToGridFS returned falsy result");
      }
    } catch (helperErr) {
      // fallback to manual GridFS upload
      console.warn("[upload] uploadToGridFS failed or incompatible; falling back to GridFS. error:", helperErr);

      // convert Web File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const db = mongoose.connection.db;
      if (!db) throw new Error("DB connection missing for GridFS fallback");
      const bucket = new GridFSBucket(db, { bucketName: "uploads" });
      const uploadStream = bucket.openUploadStream(filename, { contentType });
      uploadStream.end(buffer);

      await new Promise<void>((resolve, reject) => {
        uploadStream.on("finish", () => resolve());
        uploadStream.on("error", (err) => reject(err));
      });

      fileUrl = `/api/files/${uploadStream.id.toString()}`;
    }

    // If request includes productId -> treat as "image-only upload for existing product"
    const productId = formData.get("productId") as string | null;
    if (productId) {
      // Just return the image URL (client should call TRPC update separately)
      return NextResponse.json({ success: true, image: [fileUrl] });
    }

    // ELSE -> treat as "create new product" (existing behavior)
    const productName = (formData.get("productName") as string) || undefined;
    const productCategory = (formData.get("productCategory") as string) || undefined;
    const price = Number(formData.get("price") ?? 0);
    const prodSpecs = (formData.get("prodSpecs") as string) || undefined;
    const minQuantity = Number(formData.get("minQuantity") ?? 1);
    const stock=Number(formData.get("stock") ?? 0);
    const voltageRatings = formData.get("voltageRatings")
      ? JSON.parse(formData.get("voltageRatings") as string)
      : [];
    const ahRatings = formData.get("ahRatings")
      ? JSON.parse(formData.get("ahRatings") as string)
      : [];
    const subprodlst = formData.get("subprodlst")
      ? JSON.parse(formData.get("subprodlst") as string)
      : [];
    if(!productName || !productCategory || !prodSpecs){
      return NextResponse.json({error:"Missing Required Feilds"},{status:400})
    }
    // create TRPC caller and add product
    const caller = createCaller();
    const newProduct = await caller.product.addProduct({
      productName,
      productCategory,
      price,
      prodSpecs,
      minQuantity,
      stock,
      image: [fileUrl!],
      voltageRatings,
      ahRatings,
      subprodlst,
    });

    return NextResponse.json({ success: true, product: newProduct, image: [fileUrl] });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    let errorMessage:string;
    if(err instanceof Error){
      errorMessage=err.message
    }else {
      errorMessage=String(err)
    }
    return NextResponse.json({ error: "Upload failed", details: errorMessage || String(err) }, { status: 500 });
  }
}
