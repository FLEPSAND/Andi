// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config';

// https://astro.build
export default defineConfig({
  site: SITE.url,
  trailingSlash: 'ignore',
  compressHTML: true,
  integrations: [sitemap()],
  build: {
    // Clean directory URLs (rechner/pv-solar/index.html) so it works on plain
    // static webspace (IONOS) without server rewrites.
    format: 'directory',
  },
});
