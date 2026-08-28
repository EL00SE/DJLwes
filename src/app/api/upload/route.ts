import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** Issues short-lived client-upload tokens for every admin image/video
 * picker (event cover, About photos, gallery items). Uploads go straight
 * from the admin's browser to Blob storage (not through this server), so
 * this route's only job is to gate *who* gets a token — hence the same
 * admin-session check every other /admin mutation uses, done manually
 * here since this isn't a server action and can't call requireAdmin()'s
 * redirect-based version.
 *
 * Callers that also accept video (currently just the gallery manager)
 * pass `clientPayload: JSON.stringify({ allowVideo: true })` to widen
 * what's accepted — everything else stays image-only, since a video URL
 * saved into e.g. the cover-image field would just silently not work. */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!(await isAdminRequest())) {
          throw new Error("Unauthorized");
        }
        const allowVideo = (() => {
          try {
            return Boolean(clientPayload && JSON.parse(clientPayload).allowVideo);
          } catch {
            return false;
          }
        })();
        return {
          allowedContentTypes: allowVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES,
          addRandomSuffix: true,
          // Videos are inherently bigger — 10MB is plenty for a photo but
          // would reject most real short clips.
          maximumSizeInBytes: (allowVideo ? 50 : 10) * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // No follow-up needed — the uploaded blob's URL is saved onto the
        // relevant row when the surrounding form is submitted.
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
