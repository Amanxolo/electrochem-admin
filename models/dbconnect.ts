import mongoose from "mongoose";

declare global {
  var mongoose: {
    conn: typeof import("mongoose") | null;
    promise: Promise<typeof import("mongoose")> | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  const mongodbUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error("Please define MONGO_URI or MONGODB_URI in .env.local");
  }

  // Reuse existing connection
  if (cached.conn) {
    return cached.conn;
  }
  const MAX_RETRIES = 2;
  // Reuse in-flight promise (prevents multiple simultaneous connections)
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (!cached.promise) {
        cached.promise = mongoose.connect(mongodbUri, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 60000,
        });
      }

      cached.conn = await cached.promise;
      return cached.conn; // success → exit
    } catch (e) {
      cached.promise = null; // reset

      if (attempt === MAX_RETRIES - 1) {
        throw e; // only throw on last attempt
      }

      // console.log(`Retrying MongoDB connection... Attempt ${attempt + 1}`);
    }
  }
}

export async function uploadToGridFS(file: File): Promise<string> {
  if (!mongoose.connection.db) {
    throw new Error("Database not connected");
  }

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });

  const uploadStream = bucket.openUploadStream(file.name, {
    contentType: file.type,
  });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  uploadStream.end(fileBuffer);

  return await new Promise<string>((resolve, reject) => {
    uploadStream.on("finish", () => {
      resolve(`/api/files/${uploadStream.id.toString()}`);
    });
    uploadStream.on("error", reject);
  });
}
