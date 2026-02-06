/**
 * URL builders for cached file endpoints.
 * Only use for type: "document" documents that have PDF/thumbnail.
 */
type ThumbnailExt = "jpg" | "png";

function inferThumbnailExt(thumbnailUrl?: string): ThumbnailExt {
  if (!thumbnailUrl) return "jpg";

  // Strip query params and normalize case so we can detect ".png" / ".jpg" suffixes
  const withoutQuery = thumbnailUrl.split("?")[0]?.toLowerCase() ?? "";
  if (withoutQuery.endsWith(".png")) return "png";
  if (withoutQuery.endsWith(".jpg") || withoutQuery.endsWith(".jpeg"))
    return "jpg";

  // Most generated thumbs are JPG; fall back safely.
  return "jpg";
}

export const fileUrls = {
  pdf: (documentId: string) => `/api/open/file/${documentId}.pdf`,
  thumbnail: (documentId: string, thumbnailUrl?: string) =>
    `/api/open/file/${documentId}.${inferThumbnailExt(thumbnailUrl)}`,
};
