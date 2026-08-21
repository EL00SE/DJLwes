"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/admin/actions";

/** Same atomic-claim pattern as Order's claimOrderStatus (lib/orders.ts) —
 * a single conditional UPDATE so a double-click/two tabs can't both win
 * the same request. Kept separate since it targets a different table;
 * revisit as a shared generic helper if a third model needs this. */
async function claimPendingRequest(
  requestId: string,
  nextStatus: "APPROVED" | "DECLINED"
): Promise<boolean> {
  const result = await prisma.guestRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: nextStatus },
  });
  return result.count === 1;
}

/**
 * Approves a guest request. TODO once Grow's real API details are in
 * hand: create a Grow payment link for this request's headcount, send it
 * to customerPhone, and record growPaymentLinkUrl/growPaymentLinkSentAt.
 * For now this only flips the status — nothing is sent to the guest yet,
 * which is surfaced honestly in the admin UI (see admin/page.tsx).
 */
export async function approveGuestRequestAction(requestId: string) {
  await requireAdmin();
  await claimPendingRequest(requestId, "APPROVED");
  revalidatePath("/admin");
}

export async function declineGuestRequestAction(requestId: string) {
  await requireAdmin();
  await claimPendingRequest(requestId, "DECLINED");
  revalidatePath("/admin");
}
