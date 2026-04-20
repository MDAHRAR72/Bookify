import { NextResponse } from "next/server";
import { saveBookSegments } from "@/lib/actions/book.actions";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      bookId: string;
      segments: Array<{
        text: string;
        segmentIndex: number;
        pageNumber?: number;
        wordCount: number;
      }>;
    };

    if (!body.bookId || !Array.isArray(body.segments)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const result = await saveBookSegments(body.bookId, body.segments);

    if (!result.success) {
      return NextResponse.json(
        { error: String(result.error ?? "Failed to save book segments") },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("Error saving book segments API route:", e);
    return NextResponse.json(
      { error: "Failed to save book segments" },
      { status: 500 },
    );
  }
}
