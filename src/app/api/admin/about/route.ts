import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { aboutContentFormSchema, updateAboutContent } from "@/lib/about-content";

/** Updates the homepage's About section (bio + photos) — see
 * src/lib/about-content.ts for why this is a singleton PATCH rather than
 * a normal resource with an id in the URL. */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = aboutContentFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid About content" },
      { status: 400 }
    );
  }

  await updateAboutContent(parsed.data);
  return NextResponse.json({ ok: true });
}
