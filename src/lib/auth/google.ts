import "server-only";

import {
  createHash,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
  type JsonWebKey,
} from "node:crypto";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";

/**
 * Cookie path for PKCE/state. Must be "/" so the callback always receives them.
 * A path limited to `/api/auth/google/callback` failed silently in some browsers
 * (cookies not sent → login?google=expired with a soft notice users miss).
 */
export const GOOGLE_OAUTH_COOKIE_PATH = "/";
/** How long the browser keeps PKCE/state cookies after "Continue with Google". */
export const GOOGLE_OAUTH_MAX_AGE_SECONDS = 20 * 60;
export const GOOGLE_OAUTH_COOKIES = {
  state: "datagrid_google_state",
  nonce: "datagrid_google_nonce",
  verifier: "datagrid_google_verifier",
  referral: "datagrid_google_referral",
} as const;

/** Login `?google=` reasons returned by the OAuth callback / start routes. */
export type GoogleLoginReason =
  | "phone"
  | "cancelled"
  | "expired"
  | "mismatch"
  | "invalid"
  | "suspended"
  | "config"
  | "unavailable"
  | "session"
  | "2fa";

type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleIdTokenHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

export type GoogleIdentity = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  iss: string;
  aud: string | string[];
  azp?: string;
  exp: number;
  iat: number;
  nonce?: string;
};

type GoogleJwk = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

/** Trim and strip accidental surrounding quotes from env values (common on Vercel paste). */
export function cleanEnv(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

export function getGoogleConfig(requestUrl: string): GoogleConfig | null {
  const clientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  if (!clientId || !clientSecret) return null;

  const requestOrigin = new URL(requestUrl).origin;
  const configuredBase = cleanEnv(process.env.NEXT_PUBLIC_APP_URL);
  const configuredRedirect = cleanEnv(process.env.GOOGLE_REDIRECT_URI);
  const originCallback = `${requestOrigin}/api/auth/google/callback`;

  /**
   * Always land the OAuth callback on the same host the user started from.
   * If env points at production (datagrid-ng.com) but the user is on localhost
   * (or www vs apex), PKCE cookies are set on host A and Google returns to
   * host B → silent fail / expired state.
   *
   * Google Cloud Console must list every redirect URI you use
   * (production + http://localhost:3000/api/auth/google/callback).
   */
  let redirectUri = originCallback;
  if (configuredRedirect) {
    try {
      const configuredOrigin = new URL(configuredRedirect).origin;
      if (configuredOrigin === requestOrigin) {
        redirectUri = configuredRedirect;
      } else {
        console.warn("[auth/google] redirect host mismatch — using request origin", {
          configuredRedirect,
          requestOrigin,
          using: originCallback,
        });
      }
    } catch {
      redirectUri = originCallback;
    }
  } else if (configuredBase) {
    try {
      if (new URL(configuredBase).origin === requestOrigin) {
        redirectUri = new URL(
          "/api/auth/google/callback",
          configuredBase
        ).toString();
      }
    } catch {
      /* keep originCallback */
    }
  }

  return { clientId, clientSecret, redirectUri };
}

export function createGoogleAuthorization({
  config,
  state,
  nonce,
  codeChallenge,
}: {
  config: GoogleConfig;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
  }).toString();
  return url;
}

export function randomOAuthValue(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function secureStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function exchangeGoogleCode({
  config,
  code,
  codeVerifier,
}: {
  config: GoogleConfig;
  code: string;
  codeVerifier: string;
}) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let googleError = "";
    try {
      const body = (await response.json()) as {
        error?: unknown;
        error_description?: unknown;
      };
      const err =
        typeof body.error === "string" ? body.error : "unknown_error";
      const desc =
        typeof body.error_description === "string"
          ? body.error_description
          : "";
      googleError = desc ? `${err}: ${desc}` : err;
    } catch {
      googleError = (await response.text().catch(() => "")).slice(0, 200);
    }
    throw new Error(
      `Google token exchange failed (${response.status})${googleError ? ` — ${googleError}` : ""}`
    );
  }

  const payload = (await response.json()) as { id_token?: unknown };
  if (typeof payload.id_token !== "string") {
    throw new Error("Google token response did not include an ID token");
  }
  return payload.id_token;
}

/**
 * Allowed Google OAuth client IDs for ID token `aud` / `azp`.
 * Web uses GOOGLE_CLIENT_ID; native Sign-In often has aud=web client and
 * azp=Android/iOS client — both must be listed in env for mobile.
 */
export function getGoogleAudiences(): string[] {
  const ids = [
    cleanEnv(process.env.GOOGLE_CLIENT_ID),
    cleanEnv(process.env.GOOGLE_ANDROID_CLIENT_ID),
    cleanEnv(process.env.GOOGLE_IOS_CLIENT_ID),
  ].filter((v): v is string => Boolean(v));
  return [...new Set(ids)];
}

export async function verifyGoogleIdToken({
  idToken,
  audience,
  audiences,
  nonce,
  requireNonce = true,
}: {
  idToken: string;
  /** Single expected audience (web OAuth). */
  audience?: string;
  /** Multiple allowed audiences (mobile + web client IDs). */
  audiences?: string[];
  /** Required when requireNonce is true (browser PKCE flow). */
  nonce?: string;
  /**
   * Web OAuth always embeds a nonce. Native google_sign_in ID tokens usually
   * do not — pass requireNonce: false for mobile token exchange.
   */
  requireNonce?: boolean;
}): Promise<GoogleIdentity> {
  const segments = idToken.split(".");
  if (segments.length !== 3) throw new Error("Malformed Google ID token");

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const header = decodeJwtPart<GoogleIdTokenHeader>(encodedHeader);
  const claims = decodeJwtPart<GoogleIdentity & { email_verified?: unknown }>(
    encodedPayload
  );

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported Google ID token signature");
  }

  let jwk = await findGoogleKey(header.kid, true);
  if (!jwk) jwk = await findGoogleKey(header.kid, false);
  if (!jwk) throw new Error("Google signing key not found");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const validSignature = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, "base64url")
  );
  if (!validSignature) throw new Error("Invalid Google ID token signature");

  const now = Math.floor(Date.now() / 1000);
  const validIssuer =
    claims.iss === "https://accounts.google.com" ||
    claims.iss === "accounts.google.com";
  if (!validIssuer) throw new Error("Invalid Google ID token issuer");

  if (!Number.isFinite(claims.exp) || claims.exp <= now) {
    throw new Error("Expired Google ID token");
  }
  if (!Number.isFinite(claims.iat) || claims.iat > now + 60) {
    throw new Error("Invalid Google ID token issue time");
  }
  if (!claims.sub || claims.sub.length > 255) {
    throw new Error("Invalid Google account identifier");
  }

  const emailOk =
    typeof claims.email === "string" && claims.email.includes("@");
  // Google may encode this as boolean true or (rarely) the string "true"
  const verifiedFlag = claims.email_verified as unknown;
  const emailVerified =
    verifiedFlag === true || verifiedFlag === "true" || verifiedFlag === 1;
  if (!emailOk || !emailVerified) {
    throw new Error("Google email is not verified");
  }

  /**
   * WEB browser OAuth (requireNonce: true) — restore original exact semantics:
   *   aud must match clientId, azp if present must equal clientId, nonce required.
   * Do not use multi-audience rules here; those broke nothing on paper but we
   * keep the pre-mobile path byte-for-byte equivalent for production safety.
   */
  if (requireNonce) {
    if (!audience) throw new Error("No Google audience configured");
    if (!nonce) throw new Error("Invalid Google ID token nonce");

    const validAudience = Array.isArray(claims.aud)
      ? claims.aud.includes(audience)
      : claims.aud === audience;
    if (!validAudience) throw new Error("Invalid Google ID token audience");
    if (claims.azp && claims.azp !== audience) {
      throw new Error("Invalid Google authorized presenter");
    }
    if (!claims.nonce || !secureStringEqual(claims.nonce, nonce)) {
      throw new Error("Invalid Google ID token nonce");
    }
  } else {
    /**
     * MOBILE native Sign-In:
     * - aud is usually the Web client ID (serverClientId)
     * - azp is often the Android/iOS client ID (may not be in env yet)
     * Accept if aud matches any configured client. If azp is present and we
     * know extra client IDs, prefer them; otherwise do not reject solely on azp
     * when aud already matched (otherwise Android breaks without ANDROID_CLIENT_ID).
     */
    const allowed = [
      ...(audiences || []),
      ...(audience ? [audience] : []),
      ...getGoogleAudiences(),
    ].filter(Boolean);
    const uniqueAllowed = [...new Set(allowed)];
    if (uniqueAllowed.length === 0) {
      throw new Error("No Google audience configured");
    }

    const claimAud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const validAudience = claimAud.some((a) =>
      uniqueAllowed.includes(String(a))
    );
    if (!validAudience) throw new Error("Invalid Google ID token audience");

    if (claims.azp && !uniqueAllowed.includes(claims.azp)) {
      // aud already validated against our web client — common for Android.
      console.warn(
        "[auth/google] azp not in allow-list; accepting because aud matched",
        { azp: claims.azp.slice(0, 12) + "…" }
      );
    }
  }

  return {
    ...claims,
    email: claims.email.trim().toLowerCase(),
    email_verified: true,
  };
}

async function findGoogleKey(kid: string, useCache: boolean) {
  const response = await fetch(GOOGLE_JWKS_ENDPOINT, {
    ...(useCache
      ? { next: { revalidate: 60 * 60 } }
      : { cache: "no-store" as const }),
  });
  if (!response.ok) {
    throw new Error(`Unable to load Google signing keys (${response.status})`);
  }
  const payload = (await response.json()) as { keys?: GoogleJwk[] };
  return payload.keys?.find(
    (key) =>
      key.kid === kid &&
      key.kty === "RSA" &&
      (!key.alg || key.alg === "RS256") &&
      (!key.use || key.use === "sig")
  );
}

function decodeJwtPart<T>(segment: string): T {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
  } catch {
    throw new Error("Malformed Google ID token payload");
  }
}
