import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?github_error=missing_code", request.url));
  }

  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("GitHub OAuth is missing NEXT_PUBLIC_GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.");
    return NextResponse.redirect(new URL("/?github_error=oauth_not_configured", request.url));
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
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

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("GitHub OAuth Error:", tokenData);
      return NextResponse.redirect(new URL("/?github_error=auth_failed", request.url));
    }

    const response = NextResponse.redirect(new URL("/?github_connected=true", request.url));

    // Token'ı 7 günlük cookie olarak kaydediyoruz
    response.cookies.set("gh_token", tokenData.access_token, {
      httpOnly: false, // İstemci tarafında kontrol edilebilmesi için
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("GitHub Callback Exception:", error);
    return NextResponse.redirect(new URL("/?github_error=server_error", request.url));
  }
}
