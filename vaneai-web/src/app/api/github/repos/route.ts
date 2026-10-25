import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("gh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized. Missing GitHub token." }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch repositories from GitHub." }, { status: response.status });
    }

    const repos = await response.json();

    // Sadece ihtiyacımız olan alanları dönüyoruz
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
      html_url: repo.html_url,
    }));

    return NextResponse.json(formattedRepos);
  } catch (error) {
    console.error("GitHub Repos Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}