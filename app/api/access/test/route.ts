import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const response = NextResponse.redirect(
    new URL(
      form.get("game") === "dna"
        ? "/dna"
        : form.get("game") === "word"
          ? "/word"
          : "/sudoku",
      request.url,
    ),
    303,
  );
  response.cookies.set("onegames_test", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return response;
}
