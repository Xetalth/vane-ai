import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out from GitHub." });

  // gh_token çerezini süresini geçmiş olarak işaretleyip siliyoruz
  response.cookies.set("gh_token", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}