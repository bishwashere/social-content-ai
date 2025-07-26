import { videoCache } from "@/lib/video-cache";
import { useState, useEffect } from "react";

export const useVideoCache = (videoUrl: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) return;

    const loadVideo = async () => {
      setIsLoaded(false);

      // Try to get from cache first
      const cachedResponse = await videoCache.getVideo(videoUrl);

      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        setCachedUrl(URL.createObjectURL(blob));
        setIsLoaded(true);
        return;
      }

      // If not in cache, cache it
      await videoCache.cacheVideo(videoUrl);
      const newCachedResponse = await videoCache.getVideo(videoUrl);

      if (newCachedResponse) {
        const blob = await newCachedResponse.blob();
        setCachedUrl(URL.createObjectURL(blob));
      }

      setIsLoaded(true);
    };

    loadVideo();

    return () => {
      // Cleanup object URL when component unmounts
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
  }, [videoUrl]);

  return {
    isLoaded,
    cachedUrl: cachedUrl || videoUrl,
  };
};
