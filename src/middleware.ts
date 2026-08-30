import { NextResponse, type NextRequest } from "next/server";

/**
 * Site-wide pause. When HOSTING_PAUSED is "1" / "true" / "on",
 * every request (pages + APIs) gets a blank 503 page.
 * Turn off: HOSTING_PAUSED=0 (or unset) and restart / redeploy.
 */
function hostingPaused(): boolean {
  const raw = (process.env.HOSTING_PAUSED || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

const PAUSED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Deployment temporarily paused</title>
  <style>
    html, body { margin: 0; height: 100%; background: #f5f3ec; color: #0e211a; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      padding: 24px;
    }
    p { margin: 0; font-size: 16px; line-height: 1.5; text-align: center; }
  </style>
</head>
<body>
  <p>Deployment temporarily paused, hosting expired</p>
</body>
</html>`;

export function middleware(_request: NextRequest) {
  if (!hostingPaused()) {
    return NextResponse.next();
  }

  return new NextResponse(PAUSED_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "retry-after": "3600",
    },
  });
}

export const config = {
  matcher: "/:path*",
};
