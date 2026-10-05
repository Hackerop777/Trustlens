import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QRRequestSchema = z.object({
  extractedText: z.string().optional(),
  extractedUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = QRRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid QR payload" }, { status: 400 });
    }

    const targetUrl = parsed.data.extractedUrl || parsed.data.extractedText;

    if (!targetUrl) {
      return NextResponse.json({ error: "No URL or text found in QR payload" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      targetUrl,
      isUrl: /^https?:\/\//i.test(targetUrl),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process QR" }, { status: 500 });
  }
}
