import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI as string;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI in .env.local');
}

let isConnected = false;

export async function dbConnect() {
  if (isConnected){
    console.log('MongoDB is already connected');
    return;
  }
  const db = await mongoose.connect(MONGODB_URI);
  isConnected = db.connections[0].readyState === 1;
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