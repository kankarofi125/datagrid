import "server-only";

import { prisma } from "@/lib/db";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/email/brevo";
import {
  buildFundEmailHtml,
  buildFundEmailSubject,
  buildFundEmailText,
} from "@/lib/email/templates/fund";
import {
  buildPurchaseEmailHtml,
  buildPurchaseEmailSubject,
  buildPurchaseEmailText,
} from "@/lib/email/templates/purchase";

/**
 * Fire-and-forget branded emails. Never throws to callers.
 * Skips users without email or when Brevo is not configured.
 */

async function userEmail(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
}

export async function emailWalletFunded(opts: {
  userId: string;
  amount: number;
  orderRef: string;
  balance?: number;
  method?: string;
}): Promise<void> {
  try {
    if (!isBrevoConfigured()) return;
    const user = await userEmail(opts.userId);
    if (!user?.email) return;

    const firstName = user.name?.split(" ")[0];
    const payload = {
      firstName,
      amount: opts.amount,
      orderRef: opts.orderRef,
      balance: opts.balance,
      method: opts.method,
    };

    const result = await sendBrevoEmail({
      to: { email: user.email, name: firstName },
      subject: buildFundEmailSubject(opts.amount),
      html: buildFundEmailHtml(payload),
      text: buildFundEmailText(payload),
    });

    if (!result.ok) {
      console.error("[email/notify] fund failed", result.error);
    }
  } catch (error) {
    console.error(
      "[email/notify] fund error",
      error instanceof Error ? error.message : error
    );
  }
}

export async function emailPurchaseDelivered(opts: {
  userId: string;
  amount: number;
  orderRef: string;
  service: string;
  phone?: string | null;
  planName?: string | null;
  networkCode?: string | null;
  token?: string | null;
  customerName?: string | null;
}): Promise<void> {
  try {
    if (!isBrevoConfigured()) return;
    const user = await userEmail(opts.userId);
    if (!user?.email) return;

    const firstName = user.name?.split(" ")[0];
    const payload = {
      firstName,
      amount: opts.amount,
      orderRef: opts.orderRef,
      service: opts.service,
      phone: opts.phone,
      planName: opts.planName,
      networkCode: opts.networkCode,
      token: opts.token,
      customerName: opts.customerName,
    };

    const result = await sendBrevoEmail({
      to: { email: user.email, name: firstName },
      subject: buildPurchaseEmailSubject(payload),
      html: buildPurchaseEmailHtml(payload),
      text: buildPurchaseEmailText(payload),
    });

    if (!result.ok) {
      console.error("[email/notify] purchase failed", result.error);
    }
  } catch (error) {
    console.error(
      "[email/notify] purchase error",
      error instanceof Error ? error.message : error
    );
  }
}
