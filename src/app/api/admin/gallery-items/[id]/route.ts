import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { galleryItemFormSchema } from "@/lib/gallery-items";

/** Updates a gallery item's caption (or replaces its file/type entirely,
 * if the admin re-uploads). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [existing, body] = await Promise.all([
    prisma.galleryItem.findUnique({ where: { id } }),
    request.json().catch(() => undefined),
  ]);
  if (!existing) {
    return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
  }
  if (body === undefined) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = galleryItemFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid gallery item" },
      { status: 400 }
    );
  }
  const { type, url, caption, focalPoint } = parsed.data;

  await prisma.galleryItem.update({
    where: { id },
    data: { type, url, caption: caption || null, focalPoint },
  });

  return NextResponse.json({ id });
}

/** Deletes a gallery item — nothing else references it, so no
 * "already in use" guard is needed the way ticket tiers have. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await prisma.galleryItem.delete({ where: { id } });
  } catch (err) {
    // P2025 = "record not found" — already gone (or a race with another
    // delete); either way the end state the caller wanted is achieved.
    const alreadyGone = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
    if (!alreadyGone) throw err;
  }

  return NextResponse.json({ ok: true });
}
