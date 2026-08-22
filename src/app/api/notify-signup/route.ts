import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email("A valid email is required"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email" },
      { status: 400 }
    );
  }

  try {
    await prisma.notifySignup.create({ data: { email: parsed.data.email } });
  } catch (err) {
    // Already signed up — treat as success rather than surfacing a
    // confusing "duplicate" error to someone who just wants to be notified.
    const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) throw err;
  }

  return NextResponse.json({ ok: true });
}
