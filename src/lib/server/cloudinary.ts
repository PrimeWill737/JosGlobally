import "server-only";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
export function privateBucket(bucket: string) {
  if (!["receipts", "documents"].includes(bucket))
    throw new Error("Unknown private bucket");
  return {
    async upload(path: string, bytes: Buffer | Uint8Array, _options?: unknown) {
      try {
        await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "raw",
                type: "authenticated",
                public_id: `jos-globally/${bucket}/${path}`,
                overwrite: false,
              },
              (error, result) => (error ? reject(error) : resolve(result)),
            )
            .end(Buffer.from(bytes));
        });
        return { data: { path }, error: null };
      } catch {
        return { data: null, error: new Error("Private media upload failed.") };
      }
    },
    async remove(paths: string[]) {
      try {
        for (const path of paths)
          await cloudinary.uploader.destroy(`jos-globally/${bucket}/${path}`, {
            resource_type: "raw",
            type: "authenticated",
            invalidate: true,
          });
        return { error: null };
      } catch {
        return { error: new Error("Private media cleanup failed.") };
      }
    },
    async createSignedUrl(path: string, seconds: number, _options?: unknown) {
      try {
        const signedUrl = cloudinary.utils.private_download_url(
          `jos-globally/${bucket}/${path}`,
          "",
          {
            resource_type: "raw",
            type: "authenticated",
            expires_at: Math.floor(Date.now() / 1000) + Math.min(seconds, 60),
            attachment: true,
          },
        );
        return { data: { signedUrl }, error: null };
      } catch {
        return {
          data: null,
          error: new Error("Private media signing failed."),
        };
      }
    },
  };
}
