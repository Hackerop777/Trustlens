import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeMessage } from "@/lib/message/analyzer";

const MessageRequestSchema = z.object({
  message: z.string().min(1, "Message text cannot be empty"),
  senderHeader: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MessageRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await analyzeMessage({
      content: parsed.data.message,
      senderHeader: parsed.data.senderHeader,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Message Analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze message", details: error?.message },
      { status: 500 }
    );
  }
}
