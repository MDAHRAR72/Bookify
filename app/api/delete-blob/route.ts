import { auth } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { pathnames } = await req.json();

  if (!Array.isArray(pathnames) || pathnames.length === 0) {
    return NextResponse.json(
      { success: false, error: "No pathnames provided" },
      { status: 400 },
    );
  }

  await Promise.all(
    pathnames.map(async (pathname: string) => {
      try {
        await del(pathname);
      } catch (err) {
        console.error("Failed to delete blob:", pathname, err);
      }
    }),
  );

  return NextResponse.json({ success: true });
}
