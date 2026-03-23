/**
 * Unit test for middleware IP → city routing logic.
 * Run with: node test-middleware.mjs
 * No dependencies required.
 */

// ─── replicated from middleware/index.ts ───────────────────────────────────

const CITY_IP_MAP = {
  '89.216':  'beograd',
  '178.220': 'beograd',
  '93.87':   'novi-sad',
  '195.252': 'nis',
};

const BOT_UA_PATTERNS = ['googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp', 'facebot', 'ia_archiver'];

function isBot(ua) {
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((b) => lower.includes(b));
}

function detectCityFromIp(ip) {
  if (CITY_IP_MAP[ip]) return CITY_IP_MAP[ip];
  for (const [prefix, city] of Object.entries(CITY_IP_MAP)) {
    if (ip.startsWith(prefix + '.')) return city;
  }
  return null;
}

// ─── tests ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}  →  got "${actual}", expected "${expected}"`);
    failed++;
  }
}

console.log('\n=== IP → City detection ===');
assert('Belgrade prefix 89.216.x.x',       detectCityFromIp('89.216.12.34'),   'beograd');
assert('Belgrade prefix 178.220.x.x',      detectCityFromIp('178.220.5.9'),    'beograd');
assert('Novi Sad prefix 93.87.x.x',        detectCityFromIp('93.87.100.1'),    'novi-sad');
assert('Niš prefix 195.252.x.x',           detectCityFromIp('195.252.10.10'),  'nis');
assert('Unknown IP returns null',           detectCityFromIp('8.8.8.8'),        null);
assert('Partial prefix no match',          detectCityFromIp('89.21.1.1'),      null);

console.log('\n=== Bot detection ===');
assert('Googlebot not redirected',         isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true);
assert('Bingbot not redirected',           isBot('Mozilla/5.0 (compatible; bingbot/2.0)'), true);
assert('Normal Chrome user IS redirected', isBot('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0'), false);
assert('Normal Firefox redirected',        isBot('Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/121.0'), false);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
