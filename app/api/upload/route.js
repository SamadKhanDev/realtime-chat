import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const isCloudinaryConfigured = cloudName && cloudName !== "your_cloud_name";

    if (isCloudinaryConfigured) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        return NextResponse.json({
          success: true,
          url: uploadResult.secure_url,
        });
      } catch (err) {
        console.error("Cloudinary upload failed, falling back to base64:", err);
      }
    }

    // Fallback: return base64 Data URL directly!
    return NextResponse.json({
      success: true,
      url: base64Data,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
