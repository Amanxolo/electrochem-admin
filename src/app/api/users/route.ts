import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";
import { User, Address, DocumentUpload } from "../../../../models/user";
import mongoose from "mongoose";
interface Iuser {
  name: string;
  email: string;
  password: string;
  userType: "individual" | "reseller" | "oem";
  isVerified?: Boolean;
  addresses: Address[];
  order: mongoose.Types.ObjectId[] | string[];
  documents?: DocumentUpload;
  createdAt: Date;
  updatedAt: Date;
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("queryType");

  switch (type) {
    case "all":
      try {
        await dbConnect();
        const users: Iuser[] = await User.find().select("-password ").sort({createdAt:-1}).lean<Iuser[]>();
        if (!users) {
          return NextResponse.json(
            { message: "No users found" },
            { status: 404 },
          );
        }

         const allOrders=users.map((user: Iuser) => {
          const {order,...rest}=user;
          return {...rest,totalOrders:user.order?.length || 0}
        });
        return NextResponse.json({allOrders},{status:201})
      } catch (err) {
        return NextResponse.json(
          { message: "Error Fetching Users" },
          { status: 501 },
        );
      }
    case "forVerification":
      try {
        await dbConnect();

        const users = await User.find({
          isVerified: false,
          userType: { $in: ["reseller", "oem"] },
        }).select("-password -order -addresses");
        if (!users) {
          return NextResponse.json(
            { message: "No users found" },
            { status: 404 },
          );
        }
        return NextResponse.json({ users }, { status: 200 });
      } catch (error) {
        return new Response(
          JSON.stringify({ message: "Error fetching users" }),
          { status: 500 },
        );
      }
    case "forVerificationbyEmail":
      try {
        await dbConnect();
        const email: string | null = searchParams.get("email");
        if (!email) {
          return NextResponse.json(
            { message: "Email parameter is required" },
            { status: 400 },
          );
        }
        const decodedEmail = decodeURIComponent(email || "");
        const user = await User.find({ email: decodedEmail }).select(
          "-password -order -addresses",
        );
        if (!user) {
          return NextResponse.json(
            { message: "User not found" },
            { status: 404 },
          );
        }
        return NextResponse.json({ user }, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          { message: "Error fetching user by email" },
          { status: 500 },
        );
      }
    default:
      return new Response(JSON.stringify({ message: "Invalid type" }), {
        status: 400,
      });
  }

  return NextResponse.json({ message: "Invalid request" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const queryType = searchParams.get("queryType");
    switch (queryType) {
      case "verifyUser":
        const body = await req.json();
        const { userId } = body;
        const user = await User.findByIdAndUpdate(
          userId,
          { isVerified: true },
          { new: true },
        );
        if (!user) {
          return NextResponse.json(
            { message: "User not found" },
            { status: 404 },
          );
        }
        return NextResponse.json(
          { message: "User verified successfully" },
          { status: 200 },
        );
      default:
        return NextResponse.json(
          { message: "Invalid query type" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating user verification status" },
      { status: 500 },
    );
  }
}
