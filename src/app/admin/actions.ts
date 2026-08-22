"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refundPayPalCapture } from "@/lib/paypal";
import { sendTicketConfirmation } from "@/lib/notify";
import { confirmBankTransferPayment } from "@/lib/fulfill-order";
import { claimOrderStatus, orderWithDetailsInclude } from "@/lib/orders";
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

  if (!(await claimOrderStatus(orderId, ["PAID"], "CONFIRMED"))) {
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

/** Declines a PAID order: refunds it via PayPal (if that's how it was
 * paid) and releases the inventory either way — the buyer isn't getting
 * the ticket regardless of how (or whether) the money itself gets back
 * to them, so the ticket goes back into stock even on the bank-transfer
 * path, which has no refund API to call and needs the owner to actually
 * wire the money back themselves, outside this app. */
export async function declineOrderAction(orderId: string) {
  await requireAdmin();

  // Claim it as REFUNDED optimistically — this is what wins the race
  // against a concurrent Approve. Corrected to FAILED below if a PayPal
  // refund was expected but didn't actually go through, so the DB never
  // reports a refund that didn't happen.
  if (!(await claimOrderStatus(orderId, ["PAID"], "REFUNDED"))) {
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

  const releaseInventory = () =>
    prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { quantityRemaining: { increment: item.quantity } },
        });
      }
    });

  if (order.paymentMethod === "BANK_TRANSFER") {
    // Nothing left for this app to do automatically — the ticket is
    // released, and the REFUNDED status stands, but the owner still has
    // to actually send the money back themselves.
    await releaseInventory();
    console.error(`Bank-transfer order ${orderId} declined — refund the buyer manually.`);
    revalidatePath("/admin");
    return;
  }

  if (!order.paypalCaptureId) {
    // No capture id means we can't actually verify/issue a PayPal
    // refund — don't let the order sit marked REFUNDED when nothing was
    // refunded. (Inventory still isn't released here: unlike the bank-
    // transfer case above, this signals something is actually wrong with
    // the order's own records, not just "no API to call.")
    await prisma.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
    console.error(`Order ${orderId} declined but has no paypalCaptureId — refund must be issued manually.`);
    revalidatePath("/admin");
    return;
  }

  try {
    await refundPayPalCapture(order.paypalCaptureId);
    await releaseInventory();
  } catch (err) {
    console.error(`Failed to decline/refund order ${orderId}:`, err);
    await prisma.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
  }

  revalidatePath("/admin");
}

/** The human-in-the-loop equivalent of a PayPal capture: the owner has
 * checked their bank statement and confirms this order's transfer
 * actually arrived. Moves it to PAID (reserving inventory) so it then
 * flows through the exact same confirm/decline pipeline as a PayPal
 * order from here. */
export async function confirmBankTransferAction(orderId: string) {
  await requireAdmin();
  const result = await confirmBankTransferPayment(orderId);
  if (!result.ok) {
    console.error(`Bank transfer confirmation failed for order ${orderId}: ${result.error}`);
  }
  revalidatePath("/admin");
}

/** Cancels a bank-transfer request that's still just sitting PENDING —
 * e.g. the buyer said never mind, or enough time passed with no transfer
 * showing up. Nothing to refund (no payment was ever taken) and no
 * inventory to release (never reserved until confirmed). */
export async function cancelBankTransferRequestAction(orderId: string) {
  await requireAdmin();
  await claimOrderStatus(orderId, ["PENDING"], "CANCELED");
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
