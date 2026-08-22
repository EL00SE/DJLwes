"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/admin/actions";

export type CheckInResult =
  | {
      ok: true;
      alreadyCheckedIn: boolean;
      customerName: string;
      ticketSummary: string;
      checkedInAt: string;
    }
  | { ok: false; reason: "not_found" | "not_confirmed"; customerName?: string };

function ticketSummary(items: { quantity: number; ticketType: { name: string } }[]) {
  return items.map((item) => `${item.quantity} × ${item.ticketType.name}`).join(", ");
}

/**
 * The core of door check-in: one-directional (never un-checks someone in)
 * so scanning the same ticket twice reports a clear "already in" warning
 * rather than silently toggling them back out. Shared by the QR-scan page
 * (called directly, no form) and the /admin/checkin/[orderId] page's
 * "Check In" button.
 */
export async function checkInOrderAction(orderId: string): Promise<CheckInResult> {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { ticketType: true } } },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (order.status !== "CONFIRMED") {
    return { ok: false, reason: "not_confirmed", customerName: order.customerName };
  }

  // Only sets checkedInAt if it's still null — the winner of this claim is
  // the "fresh" check-in; anyone else scanning the same ticket afterwards
  // (a double-scan, or a second person in the group) sees alreadyCheckedIn.
  const claim = await prisma.order.updateMany({
    where: { id: orderId, checkedInAt: null },
    data: { checkedInAt: new Date() },
  });

  const fresh = await prisma.order.findUnique({ where: { id: orderId } });
  revalidatePath(`/admin/checkin/${orderId}`);

  return {
    ok: true,
    alreadyCheckedIn: claim.count === 0,
    customerName: order.customerName,
    ticketSummary: ticketSummary(order.items),
    checkedInAt: (fresh?.checkedInAt ?? new Date()).toISOString(),
  };
}

/** Manual fallback for the scan page — looks an order up by the short
 * reference shown to buyers (see orderReference in lib/orders.ts) instead
 * of the full order id, for when the camera can't read a QR. */
export async function checkInByReferenceAction(reference: string): Promise<CheckInResult> {
  await requireAdmin();

  const suffix = reference.trim().toLowerCase();
  if (!suffix) return { ok: false, reason: "not_found" };

  const order = await prisma.order.findFirst({
    where: { id: { endsWith: suffix } },
    select: { id: true },
  });
  if (!order) return { ok: false, reason: "not_found" };

  return checkInOrderAction(order.id);
}

/** Same as checkInOrderAction, but discards the result — for binding
 * directly to a <form action>, which requires a void-returning function
 * (the /admin/checkin/[orderId] page reads the updated order straight
 * from the database on its own next render instead). */
export async function checkInOrderFormAction(orderId: string): Promise<void> {
  await checkInOrderAction(orderId);
}

/** Corrects a mistaken check-in (wrong person scanned, duplicate ticket,
 * etc). Only exposed on the full /admin/checkin/[orderId] page — never
 * from the rapid-fire scan flow, where a second scan should warn rather
 * than silently undo the first. */
export async function undoCheckInAction(orderId: string) {
  await requireAdmin();
  await prisma.order.update({ where: { id: orderId }, data: { checkedInAt: null } });
  revalidatePath(`/admin/checkin/${orderId}`);
}
