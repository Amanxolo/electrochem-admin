import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../../models/dbconnect";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
      await dbConnect();
  
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection is not established");
      }

      const { id } = await context.params; // ✅ await params
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
  
      const fileId = new ObjectId(id);
  
      const files = await db
        .collection("uploads.files")
        .find({ _id: fileId })
        .toArray();
  
      if (!files || files.length === 0) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
  
      const file = files[0];
      // Look for browser or CDN 
      const fileEtag=`"${file.md5}"`
      const isCached=req.headers.get("if-none-match")
      if(isCached===fileEtag){
        return new NextResponse(null, { status: 304 });
      }
      const stream = bucket.openDownloadStream(fileId);
  
      // Convert Node.js Readable stream to a web stream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
      });
      const timetoCache=31536000
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": file.contentType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${file.filename}"`,
          "Cache-Control":`public,max-age=${timetoCache},s-maxage=${timetoCache} ,immutable`,
          "Etag":fileEtag
        },
      });
    } catch (error) {
      console.error("File fetch error:", error);
      return NextResponse.json({ error: "Could not fetch file" }, { status: 500 });
    }
  }