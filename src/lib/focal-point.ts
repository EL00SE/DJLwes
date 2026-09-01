import { z } from "zod";

/** A CSS `object-position` value ("N% N%", "50% 50%" = centered) — as
 * produced by FocalPointPicker and applied directly wherever a photo or
 * video is rendered with `object-cover`. Shared between Event's
 * coverImageFocalPoint and GalleryItem's focalPoint. */
export const focalPointSchema = z
  .string()
  .trim()
  .regex(/^-?\d{1,3}(\.\d+)?% -?\d{1,3}(\.\d+)?%$/, "Invalid focal point")
  .default("50% 50%");
