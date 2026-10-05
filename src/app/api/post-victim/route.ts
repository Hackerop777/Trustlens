import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPostVictimPlaybook } from "@/lib/post-victim/playbook";

const PostVictimRequestSchema = z.object({
  actionType: z.string(),
  claimedBrand: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PostVictimRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const playbook = getPostVictimPlaybook(parsed.data.actionType, parsed.data.claimedBrand);

    return NextResponse.json(playbook, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate containment steps", details: error?.message },
      { status: 500 }
    );
  }
}
