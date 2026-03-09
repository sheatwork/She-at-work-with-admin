// app/api/admin/upload/route.ts
// Returns a signed Cloudinary upload signature so the browser can upload
// directly to Cloudinary without exposing CLOUDINARY_API_SECRET client-side.
//
// POST /api/admin/upload/sign
// Body: { folder?: string }
// Returns: { signature, timestamp, apiKey, cloudName, folder }

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { folder = "admin-content" } = await req.json().catch(() => ({}));

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary env vars not configured" },
        { status: 500 }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);

    // Sign: alphabetical params + api_secret
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha256")
      .update(paramsToSign + apiSecret)
      .digest("hex");

    return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder });
  } catch (err) {
    console.error("[POST /api/admin/upload]", err);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}