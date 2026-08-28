import { z } from "zod";

export const galleryItemFormSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]),
  url: z.string().trim().min(1, "A file is required"),
  caption: z.string().trim().max(200).optional().or(z.literal("")),
});

export const reorderSchema = z.object({
  direction: z.enum(["up", "down"]),
});
