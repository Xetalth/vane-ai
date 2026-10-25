import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}?github_error=missing_code`);
  }

  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("GitHub OAuth error:", tokenData);
      return NextResponse.redirect(`${baseUrl}?github_error=${tokenData.error || "failed"}`);
    }

    const response = NextResponse.redirect(`${baseUrl}?github_connected=true`);
    response.cookies.set("gh_token", tokenData.access_token, {
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
    });

    return response;
  } catch (err) {
    console.error("OAuth exception:", err);
    return NextResponse.redirect(`${baseUrl}?github_error=internal_exception`);
  }
}