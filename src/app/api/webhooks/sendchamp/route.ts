import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Sendchamp delivery webhook (optional).
 * Paste this URL in Sendchamp → Account settings → APIs & webhooks:
 *   https://YOUR_DOMAIN/api/webhooks/sendchamp
 *
 * Used for SMS/email delivery status — not required for OTP send/confirm,
 * which is request/response. Always return 200 so Sendchamp stops retrying.
 *
 * @see https://sendchamp.readme.io/reference/webhook
 */
export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    try {
      payload = await request.text();
    } catch {
      payload = null;
    }
  }

  const summary =
    payload && typeof payload === "object"
      ? {
          service: (payload as { service?: string }).service,
          status: (payload as { status?: string }).status,
          phone_number: (payload as { phone_number?: string }).phone_number,
          reference: (payload as { reference?: string }).reference,
          sms_uid: (payload as { sms_uid?: string }).sms_uid,
        }
      : { rawType: typeof payload };

  console.info("[webhooks/sendchamp]", summary);

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sendchamp-webhook",
    hint: "POST delivery events from Sendchamp to this URL",
  });
}
