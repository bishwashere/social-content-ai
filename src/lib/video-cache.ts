type CacheConfig = {
  cacheName: string;
  maxAge?: number; // in milliseconds
  maxSize?: number; // in bytes
}

class VideoCacheService {
  private readonly cacheName: string;
  private readonly maxAge: number;
  private readonly maxSize: number;
  
  constructor(config: CacheConfig) {
    this.cacheName = config.cacheName;
    this.maxAge = config.maxAge || 24 * 60 * 60 * 1000; // 24 hours default
    this.maxSize = config.maxSize || 500 * 1024 * 1024; // 500MB default
  }

  private async getCacheInstance(): Promise<Cache | null> {
    if (!('caches' in window)) return null;
    return await caches.open(this.cacheName);
  }

  async cacheVideo(url: string): Promise<boolean> {
    try {
      const cache = await this.getCacheInstance();
      if (!cache) return false;

      // Check if video is already cached and valid
      const existingResponse = await cache.match(url);
      if (existingResponse) {
        const cachedAt = existingResponse.headers.get('cached-at');
        if (cachedAt && !this.isExpired(Number(cachedAt))) {
          return true;
        }
      }

      // Fetch and cache the video
      const response = await fetch(url);
      const responseWithTimestamp = new Response(response.body, {
        ...response,
        headers: {
          ...response.headers,
          'cached-at': Date.now().toString(),
        },
      });

      await this.ensureCacheSpace(cache);
      await cache.put(url, responseWithTimestamp);
      return true;
    } catch (error) {
      console.warn('Failed to cache video:', error);
      return false;
    }
  }

  async getVideo(url: string): Promise<Response | undefined> {
    try {
      const cache = await this.getCacheInstance();
      if (!cache) return;

      const response = await cache.match(url);
      if (!response) return;

      // Check if cached video has expired
      const cachedAt = response.headers.get('cached-at');
      if (cachedAt && this.isExpired(Number(cachedAt))) {
        await cache.delete(url);
        return;
      }

      return response;
    } catch (error) {
      console.warn('Failed to get cached video:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  private isExpired(cachedAt: number): boolean {
    return Date.now() - cachedAt > this.maxAge;
  }

  private async ensureCacheSpace(cache: Cache): Promise<void> {
    const keys = await cache.keys();
    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    if (totalSize > this.maxSize) {
      // Remove oldest cached videos until we're under the size limit
      const entries = await Promise.all(
        keys.map(async (request) => {
          const response = await cache.match(request);
          return {
            url: request.url,
            cachedAt: Number(response?.headers.get('cached-at') || 0),
          };
        })
      );

      entries.sort((a, b) => a.cachedAt - b.cachedAt);

      for (const entry of entries) {
        await cache.delete(entry.url);
        const response = await cache.match(entry.url);
        if (response) {
          const blob = await response.blob();
          totalSize -= blob.size;
        }
        if (totalSize <= this.maxSize) break;
      }
    }
  }
}

// Create a singleton instance with default configuration
export const videoCache = new VideoCacheService({
  cacheName: 'video-cache-v1',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 500 * 1024 * 1024, // 500MB
});