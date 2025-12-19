import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://umerkhan.io',
  integrations: [mdx(), sitemap(), tailwind()],
  devToolbar: {
    enabled: false
  },
  prefetch: {
    prefetchAll: true, // Enable prefetching for all links
    defaultStrategy: 'hover' // Start prefetching when hovering over links
  }
});