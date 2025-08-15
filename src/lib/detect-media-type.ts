export function detectMediaTypeFromUrl(
  url: string
): "img" | "video" | "unknown" {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const extension = pathname.split(".").pop()?.toLowerCase();

    if (!extension) return "unknown";

    if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
      return "img";
    }

    if (["mp4", "mov", "webm", "avi"].includes(extension)) {
      return "video";
    }
    console.log(extension, pathname);
    return "unknown";
  } catch {
    return "unknown";
  }
}
