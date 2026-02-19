import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI in .env.local");
}

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
  // Reuse existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // Reuse in-flight promise (prevents multiple simultaneous connections)
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
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
