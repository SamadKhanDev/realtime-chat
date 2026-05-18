import { connectDB, User } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj?.value;

    let currentUserId = null;
    if (token) {
      const secret = process.env.JWT_SECRET || "default_super_secret_key";
      try {
        const decoded = jwt.verify(token, secret);
        currentUserId = decoded.id;
      } catch (err) {
        // Invalid token, but we can continue or ignore
      }
    }

    // Fetch all users
    const query = currentUserId ? { _id: { $ne: currentUserId } } : {};
    const users = await User.find(query).select("name email avatar online createdAt");

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
