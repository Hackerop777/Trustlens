import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { investigateURL } from "@/lib/investigation/orchestrator";
import { investigateQRPayload } from "@/lib/qr/investigator";
import { analyzeMessage } from "@/lib/message/analyzer";
import { analyzeImage } from "@/lib/image/analyzer";
import { getInvestigation } from "@/lib/investigation/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Investigation ID is required" }, { status: 400 });
    }

    const investigation = getInvestigation(id);
    if (!investigation) {
      return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
    }

    return NextResponse.json(investigation, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch investigation", details: error?.message }, { status: 500 });
  }
}

const RequestSchema = z.object({
  url: z.string().optional(),
  content: z.string().optional(),
  imageData: z.string().optional(),
  type: z.enum(["URL", "MESSAGE", "IMAGE", "QR"]).optional().default("URL"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const target = (parsed.data.url || parsed.data.content || parsed.data.imageData || "").trim();
    if (!target) {
      return NextResponse.json(
        { error: "Target content, URL, or image data is required for investigation" },
        { status: 400 }
      );
    }

    const type = parsed.data.type || "URL";
    let result;

    if (type === "QR") {
      result = await investigateQRPayload(target);
    } else if (type === "MESSAGE") {
      result = await analyzeMessage({ content: target });
    } else if (type === "IMAGE") {
      result = await analyzeImage({
        imageData: parsed.data.imageData || (target.startsWith("data:image") ? target : undefined),
        extractedText: target.startsWith("data:image") ? "Uploaded Image Screenshot" : target,
      });
    } else {
      result = await investigateURL(target);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Investigation API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during investigation", details: error?.message },
      { status: 500 }
    );
  }
}
