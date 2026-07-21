import { isPaymentSimulateMode } from "./simulator";
import { makeIdempotencyKey } from "@/lib/order-ref";

export async function initializeFlutterwave(opts: {
  amountNaira: number;
  email: string;
  userId: string;
  phone: string;
  callbackUrl: string;
}) {
  if (isPaymentSimulateMode() || !process.env.FLUTTERWAVE_SECRET_KEY) {
    const reference = `FLW_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      provider: "FLUTTERWAVE" as const,
      reference,
      authorization_url: `${opts.callbackUrl}?simulate=flutterwave&ref=${reference}&amount=${opts.amountNaira}&userId=${opts.userId}`,
      simulated: true,
    };
  }

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: makeIdempotencyKey("flw"),
      amount: opts.amountNaira,
      currency: "NGN",
      redirect_url: opts.callbackUrl,
      customer: { email: opts.email, phonenumber: opts.phone },
      meta: { userId: opts.userId },
    }),
  });
  const data = await res.json();
  if (data.status !== "success") {
    throw new Error(data.message || "Flutterwave init failed");
  }
  return {
    provider: "FLUTTERWAVE" as const,
    reference: data.data.tx_ref as string,
    authorization_url: data.data.link as string,
    simulated: false,
  };
}
