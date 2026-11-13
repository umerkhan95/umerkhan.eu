import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: 'https://umerkhan.io',
  integrations: [mdx(), sitemap({
    // Tag listings are noindex; keep them out of the sitemap too.
    filter: (page) => !page.includes('/blog/tag/'),
  }), tailwind(), react()],
  devToolbar: {
    enabled: false
  },
  prefetch: {
    prefetchAll: true, // Enable prefetching for all links
    defaultStrategy: 'hover' // Start prefetching when hovering over links
  }
});