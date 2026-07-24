import { NextResponse } from "next/server";

const PRIVATE_NO_STORE = "private, no-store, max-age=0";
const PUBLIC_CATALOG = "public, max-age=30, s-maxage=120, stale-while-revalidate=300";

function withCacheHeaders(init: ResponseInit | undefined, cacheControl: string) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", cacheControl);
  return { ...init, headers };
}

/** Personalized and privileged data may use the server cache, never a browser/shared HTTP cache. */
export function privateJson<T>(body: T, init?: ResponseInit) {
  const response = NextResponse.json(body, withCacheHeaders(init, PRIVATE_NO_STORE));
  response.headers.append("Vary", "Cookie");
  return response;
}

/** Public catalog endpoints may be cached briefly by browsers and the deployment edge. */
export function publicCatalogJson<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, withCacheHeaders(init, PUBLIC_CATALOG));
}
