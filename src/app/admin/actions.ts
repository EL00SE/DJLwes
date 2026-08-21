"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refundPayPalCapture } from "@/lib/paypal";
import { sendTicketConfirmation } from "@/lib/notify";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  isValidSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function requireAdmin() {
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

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true, items: { include: { ticketType: true } } },
  });
  if (!order || order.status !== "PAID") {
    revalidatePath("/admin");
    return;
  }

  const confirmed = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CONFIRMED" },
    include: { event: true, items: { include: { ticketType: true } } },
  });

  try {
    await sendTicketConfirmation(confirmed);
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

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.status !== "PAID") {
    revalidatePath("/admin");
    return;
  }

  try {
    if (order.paypalCaptureId) {
      await refundPayPalCapture(order.paypalCaptureId);
    }
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { quantityRemaining: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    });
  } catch (err) {
    console.error(`Failed to decline/refund order ${orderId}:`, err);
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  }

  revalidatePath("/admin");
}

/** Retries sending the confirmation for an already-CONFIRMED order. */
export async function resendConfirmationAction(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true, items: { include: { ticketType: true } } },
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
