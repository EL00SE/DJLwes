import { prisma } from "@/lib/prisma";
import type { Prisma, OrderStatus } from "@prisma/client";

/** The standard "give me everything needed to display/notify about an
 * order" shape — reused everywhere instead of each call site hand-writing
 * its own copy of this include (and, previously, its own copy of the
 * matching TypeScript type). */
export const orderWithDetailsInclude = {
  event: true,
  items: { include: { ticketType: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderWithDetailsInclude }>;

/** Every status an order can no longer meaningfully leave — used so
 * "is this order done, one way or another?" is answered in exactly one
 * place rather than re-derived (inconsistently) at each call site. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "CANCELED", "FAILED", "REFUNDED"];

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

/**
 * Atomically transitions an order from one of `fromStatuses` to `toStatus`
 * via a single conditional UPDATE, so concurrent callers (a double-click,
 * two admin tabs, a webhook racing an admin action) can't both "win" the
 * same transition. Returns true if this call was the one that won it.
 */
export async function claimOrderStatus(
  orderId: string,
  fromStatuses: OrderStatus[],
  toStatus: OrderStatus
): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, status: { in: fromStatuses } },
    data: { status: toStatus },
  });
  return result.count === 1;
}
