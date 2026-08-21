import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

/** Issues short-lived client-upload tokens for the admin event editor's
 * cover-image picker. Uploads go straight from the admin's browser to
 * Blob storage (not through this server), so this route's only job is to
 * gate *who* gets a token — hence the same admin-session check every
 * other /admin mutation uses, done manually here since this isn't a
 * server action and can't call requireAdmin()'s redirect-based version. */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAdminRequest())) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          addRandomSuffix: true,
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
        };
      },
      onUploadCompleted: async () => {
        // No follow-up needed — the uploaded blob's URL is saved onto the
        // Event row when the surrounding create/edit form is submitted.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
