import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  site: process.env.ASTRO_SITE,
  base: process.env.ASTRO_BASE,
  integrations: [mdx(), react()],
});
