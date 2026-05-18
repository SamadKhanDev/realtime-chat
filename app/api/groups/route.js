import { connectDB, Group } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// 1. GET - Fetch all groups current user is a member of
export async function GET(req) {
  try {
    await connectDB();

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

    // Find all groups where the members array contains currentUserId
    const groups = await Group.find({
      members: { $in: [currentUserId] },
    });

    return NextResponse.json({
      success: true,
      groups,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST - Create a new Group Room
export async function POST(req) {
  try {
    await connectDB();

    const { name, members = [], avatar } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
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

    // Ensure current user is in the group members list
    const uniqueMembers = Array.from(new Set([...members, currentUserId]));

    const newGroup = await Group.create({
      name: name.trim(),
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff`,
      members: uniqueMembers,
      createdBy: currentUserId,
    });

    return NextResponse.json({
      success: true,
      group: newGroup,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
