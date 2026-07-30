import { NextResponse } from "next/server";
import { getAccessState } from "@/lib/access/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAccessState());
}
