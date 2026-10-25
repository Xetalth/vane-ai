import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let repo = searchParams.get("repo");
  const path = searchParams.get("path") || "app/service.py";
  const token = request.cookies.get("gh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Missing GitHub access token." }, { status: 401 });
  }

  if (!repo) {
    return NextResponse.json({ error: "Missing repo parameter." }, { status: 400 });
  }

  // URL ve ön ekleri temizle
  const cleanRepo = decodeURIComponent(repo)
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .trim();

  try {
    const res = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `File '${path}' could not be resolved in '${cleanRepo}'.` },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (data.type !== "file" || !data.content) {
      return NextResponse.json(
        { error: `The path '${path}' does not point to a valid file.` },
        { status: 400 }
      );
    }

    const decodedContent = Buffer.from(data.content, "base64").toString("utf-8");

    return NextResponse.json({
      content: decodedContent,
      path: data.path,
      sha: data.sha,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}