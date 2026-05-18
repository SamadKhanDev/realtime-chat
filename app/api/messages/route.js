import { connectDB, Message } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const receiverId = searchParams.get("receiverId");
    const groupId = searchParams.get("groupId");

    if (!receiverId && !groupId) {
      return NextResponse.json({ error: "Receiver ID or Group ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET || "default_super_secret_key";
    let currentUserId;
    try {
      const decoded = jwt.verify(token, secret);
      currentUserId = decoded.id;
    } catch (err) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    let messages;
    if (groupId) {
      // Fetch messages belonging to this group
      messages = await Message.find({ groupId }).sort({ createdAt: 1 });
    } else {
      // Query messages where sender is current user and receiver is the other user, OR vice-versa
      messages = await Message.find({
        $or: [
          { sender: currentUserId, receiver: receiverId },
          { sender: receiverId, receiver: currentUserId },
        ],
      }).sort({ createdAt: 1 });
    }

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { receiverId, groupId, text, image, file } = await req.json();

    if (!receiverId && !groupId) {
      return NextResponse.json({ error: "Receiver ID or Group ID is required" }, { status: 400 });
    }

    if (!text && !image && !file) {
      return NextResponse.json({ error: "Message content is empty" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET || "default_super_secret_key";
    let currentUserId;
    try {
      const decoded = jwt.verify(token, secret);
      currentUserId = decoded.id;
    } catch (err) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    const newMessage = await Message.create({
      sender: currentUserId,
      receiver: receiverId || null,
      groupId: groupId || null,
      text,
      image,
      file,
      seen: false,
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
