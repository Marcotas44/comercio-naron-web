import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
//
// Modo híbrido: por defecto las páginas son estáticas (mantiene el rendimiento
// del sitio público existente). Las rutas que necesitan SSR (panel /admin y
// APIs /api/*) se marcan explícitamente con `export const prerender = false`.
export default defineConfig({
  site: 'https://comerciodenaron.com',
  output: 'hybrid',
  adapter: netlify(),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
