// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Média Direct Achat Discount — build statique haute performance → dist/
// URLs d'articles conservées 100% identiques à WordPress : /divers/<slug>.html
export default defineConfig({
  site: 'https://www.direct-achatdiscount.com',
  trailingSlash: 'ignore',
  build: {
    // 'preserve' : les fichiers [slug].astro sortent en <slug>.html (compat SEO WordPress),
    // les dossiers index.astro restent en URL propre (/rubrique/maison/).
    format: 'preserve',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // Cloudflare Pages sert les .html en URL propre : on liste les URLs propres.
      serialize(item) {
        item.url = item.url.replace(/\.html(\/)?$/, '$1');
        return item;
      },
    }),
  ],
  image: {
    responsiveStyles: true,
  },
  compressHTML: true,
});
