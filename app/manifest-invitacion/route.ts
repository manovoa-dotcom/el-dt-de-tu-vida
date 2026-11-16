import { NextRequest, NextResponse } from "next/server";
import manifest from "../../public/manifest.json";

export async function GET(request: NextRequest) {
  const groupSlug = request.nextUrl.searchParams.get("grupo");
  const startUrl = groupSlug
    ? `/login?grupo=${encodeURIComponent(groupSlug)}`
    : manifest.start_url;

  return NextResponse.json(
    { ...manifest, start_url: startUrl },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
