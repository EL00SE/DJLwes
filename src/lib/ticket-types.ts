import { z } from "zod";

/** Price is entered/edited in dollars (matching how it's displayed
 * everywhere else via formatPrice) and converted to cents here, once,
 * so nothing downstream has to deal with float dollar amounts. */
export const ticketTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.number().nonnegative("Price can't be negative"),
  quantityTotal: z.number().int().positive("Quantity must be at least 1").max(100_000),
});

export function dollarsToCents(price: number): number {
  return Math.round(price * 100);
}
