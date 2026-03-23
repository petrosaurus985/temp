/**
 * Location-based redirect middleware
 *
 * SEO notes (Google-compliant):
 * - Uses HTTP 302 (temporary) redirect so Google keeps the original URL indexed.
 * - The canonical tag on each city page points to itself, so city pages can also rank.
 * - Sets `Vary: Accept-Language, X-Forwarded-For` so CDNs cache per-location correctly.
 * - Never redirects Googlebot; it crawls the generic page without being redirected.
 *   (See: https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading)
 *
 * IP → city mapping:
 *   Production  → call a real IP geolocation service (e.g. ipapi.co, MaxMind).
 *   Development → add your own IP to CITY_IP_MAP for local testing.
 */

import { defineMiddleware } from 'astro:middleware';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Dummy city routing table  –  key: IP prefix / exact IP, value: city slug */
const CITY_IP_MAP: Record<string, string> = {
  // Belgrade test IPs (dummy)
  '89.216': 'beograd',     // Serbian ISP range prefix (dummy)
  '178.220': 'beograd',    // Another Serbian range (dummy)
  '93.87': 'novi-sad',     // Vojvodina range (dummy)
  '195.252': 'nis',        // Southern Serbia (dummy)
  // Add your own testing IP here, e.g.:
  // '192.168.1.1': 'beograd',
};

/** Pages the middleware should NOT touch */
const BYPASS_PATHS = new Set([
  '/nekretnine',           // already the generic hub – no redirect loop
  '/nekretnine/beograd',
  '/nekretnine/novi-sad',
  '/nekretnine/nis',
  '/sitemap.xml',
  '/robots.txt',
]);

/** Well-known Googlebot user-agent prefixes – never redirect crawlers */
const BOT_UA_PATTERNS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'slurp',       // Yahoo
  'facebot',
  'ia_archiver',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some((bot) => ua.includes(bot));
}

function getClientIp(request: Request): string | null {
  // Standard reverse-proxy header (set by Nginx / Cloudflare / Vercel etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Cloudflare sets this
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  return null;
}

function detectCityFromIp(ip: string): string | null {
  // Exact match first
  if (CITY_IP_MAP[ip]) return CITY_IP_MAP[ip];

  // Prefix match (e.g. "89.216" matches "89.216.12.34")
  for (const [prefix, city] of Object.entries(CITY_IP_MAP)) {
    if (ip.startsWith(prefix + '.')) return city;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, redirect } = context;
  const pathname = url.pathname;

  // 1. Skip non-realtor paths
  if (!pathname.startsWith('/nekretnine') && !pathname.startsWith('/real-estate')) {
    return next();
  }

  // 2. Skip if already on a city page or special path
  if (BYPASS_PATHS.has(pathname)) {
    return next();
  }

  // 3. Never redirect bots – they must index the canonical generic page
  const userAgent = request.headers.get('user-agent') ?? '';
  if (isBot(userAgent)) {
    return next();
  }

  // 4. Detect IP → city
  const ip = getClientIp(request);
  if (!ip) return next();

  const city = detectCityFromIp(ip);
  if (!city) return next();

  // 5. Build redirect target preserving sub-path and query string
  //    e.g. /nekretnine?tip=stan  →  /nekretnine/beograd?tip=stan
  const targetPath = `/nekretnine/${city}`;
  const redirectUrl = new URL(targetPath, url.origin);
  redirectUrl.search = url.search; // preserve query params

  // 302 = temporary – Google keeps the generic URL indexed
  const response = redirect(redirectUrl.toString(), 302);

  // Tell CDNs to cache separately per IP / language
  response.headers.set('Vary', 'Accept-Language, X-Forwarded-For, CF-Connecting-IP');

  return response;
});
