import { NextResponse } from "next/server";

/**
 * Guest checkout removed for security (unauthenticated free VTU fulfillment).
 * Use authenticated wallet purchase after login instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Guest checkout is no longer available. Sign in and pay from your wallet to buy data or airtime.",
      code: "GUEST_CHECKOUT_DISABLED",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      available: false,
      message: "Guest checkout disabled. Use /login then wallet purchase.",
    },
    { status: 410 }
  );
}
