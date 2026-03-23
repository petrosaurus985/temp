import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Server-side rendering required for middleware (IP detection happens at request time)
  output: 'server',

  // Site URL for canonical links – update to your real domain
  site: 'https://www.example-realty.com',
});
