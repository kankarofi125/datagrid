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
 * Branded transactional emails via Brevo.
 * Safe to await — never throws. Skips if no email / Brevo not configured.
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
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!isBrevoConfigured()) {
      console.warn("[email/notify] fund skipped: Brevo not configured");
      return { sent: false, reason: "brevo_not_configured" };
    }
    const user = await userEmail(opts.userId);
    if (!user?.email) {
      console.warn("[email/notify] fund skipped: user has no email", opts.userId);
      return { sent: false, reason: "no_email" };
    }

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
      return { sent: false, reason: result.error };
    }
    console.info("[email/notify] fund sent", {
      to: user.email,
      orderRef: opts.orderRef,
    });
    return { sent: true };
  } catch (error) {
    console.error(
      "[email/notify] fund error",
      error instanceof Error ? error.message : error
    );
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "error",
    };
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
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!isBrevoConfigured()) {
      console.warn("[email/notify] purchase skipped: Brevo not configured");
      return { sent: false, reason: "brevo_not_configured" };
    }
    const user = await userEmail(opts.userId);
    if (!user?.email) {
      console.warn(
        "[email/notify] purchase skipped: user has no email",
        opts.userId
      );
      return { sent: false, reason: "no_email" };
    }

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
      return { sent: false, reason: result.error };
    }
    console.info("[email/notify] purchase sent", {
      to: user.email,
      orderRef: opts.orderRef,
    });
    return { sent: true };
  } catch (error) {
    console.error(
      "[email/notify] purchase error",
      error instanceof Error ? error.message : error
    );
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "error",
    };
  }
}
