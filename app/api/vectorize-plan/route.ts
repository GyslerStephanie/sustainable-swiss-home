/* POST /api/vectorize-plan
   Body: { data: <base64 image or PDF>, mediaType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf" }
   Uses Claude vision to read a floor plan into structured rooms (name, area, bbox).
   Server-side only — needs ANTHROPIC_API_KEY (set it in the Vercel project). */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // vision parsing can take a while

// Structured-outputs schema — the response is guaranteed to match this shape.
// Bounding boxes are fractions (0..1) of the image, origin top-left.
const SCHEMA = {
  type: "object",
  properties: {
    rooms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          area_m2: { type: "number" },
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
        },
        required: ["name", "area_m2", "x", "y", "w", "h"],
        additionalProperties: false,
      },
    },
  },
  required: ["rooms"],
  additionalProperties: false,
} as const;

const PROMPT = `You are given a floor plan of a dwelling. Identify each distinct interior room or space (living room, kitchen, bedrooms, bathroom, hallway, etc.).

For each room return:
- name: a short label. Prefer the label printed on the plan; otherwise use a clear English name.
- area_m2: the floor area in square metres. If the plan prints an area, use it; otherwise estimate from the drawing scale or proportions.
- x, y, w, h: the room's bounding box as fractions of the whole image (0..1), origin at the top-left. x,y is the top-left corner; w,h are width and height.

Only include enclosed rooms/spaces. Ignore furniture, dimension lines, and text blocks. If the image is not a floor plan, return an empty rooms array.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Floor-plan reading isn't configured yet (ANTHROPIC_API_KEY missing)." },
      { status: 503 }
    );
  }
  let body: { data?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { data, mediaType } = body;
  if (!data || !mediaType) {
    return NextResponse.json({ error: "Provide { data, mediaType }" }, { status: 400 });
  }

  const source =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data } };

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: [source, { type: "text", text: PROMPT }] }],
      // output_config + document blocks aren't in the SDK's param types yet
    } as unknown as Anthropic.MessageCreateParamsNonStreaming);

    const block = (msg.content as Array<{ type: string; text?: string }>).find((b) => b.type === "text");
    const parsed = JSON.parse(block?.text ?? "{}");
    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    return NextResponse.json({ rooms });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not read the floor plan", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
