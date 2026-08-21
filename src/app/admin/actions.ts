"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refundPayPalCapture } from "@/lib/paypal";
import { sendTicketConfirmation } from "@/lib/notify";
import { orderWithDetailsInclude } from "@/lib/orders";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  isValidSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Redirects to /admin/login unless the session cookie is valid. Exported
 * so admin/page.tsx can reuse the exact same check instead of keeping its
 * own copy that could drift out of sync. */
export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    redirect("/admin/login");
  }
}

/**
 * Atomically moves an order from PAID to `nextStatus` — a single
 * conditional UPDATE, so if two admin actions (a double-click, two open
 * tabs) race for the same order, exactly one of them wins this claim and
 * the other sees `false` and bails out immediately. Prevents e.g. Approve
 * and Decline both succeeding for the same order.
 */
async function claimPaidOrder(orderId: string, nextStatus: "CONFIRMED" | "REFUNDED"): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: nextStatus },
  });
  return result.count === 1;
}

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect("/admin");
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

/** Approves a PAID order: marks it CONFIRMED and sends the ticket confirmation. */
export async function confirmOrderAction(orderId: string) {
  await requireAdmin();

  if (!(await claimPaidOrder(orderId, "CONFIRMED"))) {
    // Already claimed (approved/declined) by a concurrent request.
    revalidatePath("/admin");
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderWithDetailsInclude,
  });
  if (!order) {
    revalidatePath("/admin");
    return;
  }

  try {
    await sendTicketConfirmation(order);
    await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: new Date() } });
  } catch (err) {
    // The approval itself still stands — this just means the notification
    // didn't go out. confirmationSentAt stays null, so "Resend" (same
    // action, safe to call again) can retry it.
    console.error(`Approved order ${orderId} but failed to send confirmation:`, err);
  }

  revalidatePath("/admin");
}

/** Declines a PAID order: refunds it via PayPal and releases the inventory. */
export async function declineOrderAction(orderId: string) {
  await requireAdmin();

  // Claim it as REFUNDED optimistically — this is what wins the race
  // against a concurrent Approve. Corrected to FAILED below if the refund
  // itself doesn't actually go through, so the DB never reports a refund
  // that didn't happen.
  if (!(await claimPaidOrder(orderId, "REFUNDED"))) {
    revalidatePath("/admin");
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    revalidatePath("/admin");
    return;
  }

  if (!order.paypalCaptureId) {
    // No capture id means we can't actually verify/issue a refund — don't
    // let the order sit marked REFUNDED when nothing was refunded.
    await prisma.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
    console.error(`Order ${orderId} declined but has no paypalCaptureId — refund must be issued manually.`);
    revalidatePath("/admin");
    return;
  }

  try {
    await refundPayPalCapture(order.paypalCaptureId);
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { quantityRemaining: { increment: item.quantity } },
        });
      }
    });
  } catch (err) {
    console.error(`Failed to decline/refund order ${orderId}:`, err);
    await prisma.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
  }

  revalidatePath("/admin");
}

/** Retries sending the confirmation for an already-CONFIRMED order. */
export async function resendConfirmationAction(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderWithDetailsInclude,
  });
  if (!order || order.status !== "CONFIRMED") {
    revalidatePath("/admin");
    return;
  }

  try {
    await sendTicketConfirmation(order);
    await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: new Date() } });
  } catch (err) {
    console.error(`Resend failed for order ${orderId}:`, err);
  }

  revalidatePath("/admin");
}
