import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const secret = process.env.NEXTAUTH_SECRET;
    
    if (!token) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }
    if (!secret) {
      return NextResponse.json(
        { message: "No Secret Key Provided" },
        { status: 500 }
      );
    }
    jwt.verify(token, secret);

    return NextResponse.json({ message: "Token Verified" }, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ err }, { status: 401 });
    }
    return NextResponse.json(
      { Error: "Unexpected Error Occured" },
      { status: 500 }
    );
  }
}
