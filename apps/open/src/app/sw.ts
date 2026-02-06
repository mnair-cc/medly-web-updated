import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // PDF files - aggressive caching (immutable)
    {
      urlPattern: /\/api\/open\/file\/[^/]+\.pdf$/,
      handler: "CacheFirst",
      options: {
        cacheName: "open-pdfs",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Thumbnails - lighter caching
    {
      urlPattern: /\/api\/open\/file\/[^/]+\.(jpg|png)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "open-thumbnails",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
