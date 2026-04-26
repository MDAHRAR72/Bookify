import { auth } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import Book from "@/database/models/book.model";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Wrap req.json() in try/catch for parse errors
  let pathnames: unknown;
  try {
    const body = await req.json();
    pathnames = body.pathnames;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate that pathnames is an array of non-empty strings
  if (!Array.isArray(pathnames) || pathnames.length === 0) {
    return NextResponse.json(
      { success: false, error: "No pathnames provided" },
      { status: 400 },
    );
  }

  if (!pathnames.every((p) => typeof p === "string" && p.trim().length > 0)) {
    return NextResponse.json(
      { success: false, error: "All pathnames must be non-empty strings" },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    pathnames.map(async (pathname: string) => {
      // Query DB to verify ownership
      const book = await Book.findOne({
        $or: [{ fileBlobKey: pathname }, { coverBlobKey: pathname }],
      });

      // Check ownership - return 403 if no owning record or clerkId doesn't match
      if (!book || book.clerkId !== userId) {
        console.warn(
          `Unauthorized delete attempt for pathname: ${pathname}, userId: ${userId}`,
        );
        return { pathname, deleted: false, reason: "Unauthorized" };
      }

      // Only delete if authorized
      try {
        await del(pathname);
        return { pathname, deleted: true };
      } catch (err) {
        console.error("Failed to delete blob:", pathname, err);
        return { pathname, deleted: false, reason: "Deletion failed" };
      }
    }),
  );

  return NextResponse.json({ success: true, results });
}
