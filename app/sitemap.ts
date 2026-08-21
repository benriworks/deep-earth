import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: 'https://deep-earth.benriwork.jp/',
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://deep-earth.benriwork.jp/simulator',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];
}
