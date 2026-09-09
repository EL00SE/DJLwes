"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/admin/actions";

/** Marks a booking request CONTACTED — the business owner has reached
 * out directly (phone/email/Instagram); there's no automated follow-up
 * to trigger here, this just keeps /admin's inbox honest. */
export async function markBookingRequestContactedAction(requestId: string) {
  await requireAdmin();
  await prisma.bookingRequest.update({ where: { id: requestId }, data: { status: "CONTACTED" } });
  revalidatePath("/admin");
}

/** Marks a booking request CLOSED — done with, either booked or not
 * going anywhere. Moves it out of the active list. */
export async function closeBookingRequestAction(requestId: string) {
  await requireAdmin();
  await prisma.bookingRequest.update({ where: { id: requestId }, data: { status: "CLOSED" } });
  revalidatePath("/admin");
}
