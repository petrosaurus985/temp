/**
 * Dynamic sitemap – lists all indexable pages.
 * City pages are included so they can rank independently.
 * The generic /nekretnine hub is also included as the canonical source.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? 'https://www.example-realty.com';

  const pages = [
    { url: '/',                     priority: '1.0', changefreq: 'weekly'  },
    { url: '/nekretnine',           priority: '0.9', changefreq: 'daily'   },
    { url: '/nekretnine/beograd',   priority: '0.8', changefreq: 'daily'   },
    { url: '/nekretnine/novi-sad',  priority: '0.8', changefreq: 'daily'   },
    { url: '/nekretnine/nis',       priority: '0.8', changefreq: 'daily'   },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ url, priority, changefreq }) => `  <url>
    <loc>${base}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
