import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: 'https://deep-earth.benriwork.jp/', priority: 1 }, { url: 'https://deep-earth.benriwork.jp/simulator', priority: 0.9 }]; }
