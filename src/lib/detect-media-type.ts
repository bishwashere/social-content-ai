export function detectMediaTypeFromUrl(
  urlOrPath: string
): "img" | "video" | "unknown" {
  try {
    let pathname: string;
    
    // Try to parse as URL first
    try {
      const parsedUrl = new URL(urlOrPath);
      pathname = parsedUrl.pathname;
    } catch {
      // Not a valid URL, treat as a path/S3 key
      pathname = urlOrPath;
    }
    
    const extension = pathname.split(".").pop()?.toLowerCase();

    if (!extension) return "unknown";

    if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
      return "img";
    }

    if (["mp4", "mov", "webm", "avi"].includes(extension)) {
      return "video";
    }
    
    return "unknown";
  } catch {
    return "unknown";
  }
}
