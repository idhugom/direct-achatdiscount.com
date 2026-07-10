# Direct Achat Discount — le magazine des achats malins

Nouveau moteur éditorial haute performance qui remplace WordPress. Site **statique** (Astro),
déployé sur **Cloudflare Pages**, avec un contenu entièrement refait via l'**API OpenAI**.

- **Zéro CMS**, zéro base de données à l'exécution : des pages HTML pures, ultra-rapides.
- **URLs conservées à 100 %** : chaque article garde son slug WordPress (`/divers/<slug>.html`) → pas de perte SEO.
- **Design éditorial « voltage »** : hero massif, couleurs vives, animations légères, 10 rubriques couleur.
- **Contenu à forte valeur ajoutée** : encadrés, tableaux, comparatifs 2 colonnes, pour/contre, FAQ, étapes, stats.

## Stack

| | |
|---|---|
| Framework | [Astro](https://astro.build) 5 (build statique → `dist/`) |
| Contenu | Content Collections (JSON typé + Zod) dans `src/content/articles/` |
| Styles | CSS maison (design system `src/styles/global.css`), polices auto-hébergées |
| Interactions | ~2 Ko de JS vanilla (`src/scripts/app.js`) |
| Images | WebP optimisées (sharp), 2 largeurs, dans `public/media/` |
| Génération de contenu | OpenAI `gpt-5.6-terra` (Responses API + Batch API) |
| Hébergement | Cloudflare Pages (branche `main`, build `npm run build`, sortie `dist`) |

## Commandes

```bash
npm install
npm run dev        # serveur de développement
npm run build      # build de production → dist/
npm run preview    # prévisualise dist/
```

### Pipeline de migration / contenu

```bash
npm run wp:fetch          # récupère les 899 articles WP (métadonnées + slug + image) → data/wp-posts.json
npm run ai:sample -- 18   # génère un échantillon d'articles (Responses API) → src/content/articles/
npm run wp:images         # télécharge + optimise les images à la une des articles présents → public/media/

# Traitement des 1 000 articles via Batch API
npm run ai:batch:build    # construit le fichier .jsonl (un article par ligne) avec les params imposés
npm run ai:batch:submit   # envoie le batch à OpenAI, mémorise l'id
npm run ai:batch:poll     # suit l'avancement
npm run ai:batch:ingest   # récupère les résultats → src/content/articles/, puis npm run wp:images && npm run build
```

Paramètres de génération imposés (voir `scripts/article-schema.mjs`) :
`gpt-5.6-terra`, reasoning effort **high** (standard), text verbosity **high**,
`max_output_tokens: 30000`, **Responses API** en sortie structurée (JSON schema strict).

## Structure

```
src/
  content/articles/     # 1 fichier JSON par article (slug = nom de fichier)
  content.config.ts     # schéma des articles + blocs riches
  components/            # Hero, Header, Footer, ArticleCard, BlockRenderer, …
  layouts/Base.astro    # shell HTML, SEO, JSON-LD
  lib/                   # site, categories, helpers articles
  pages/
    index.astro
    divers/[slug].astro  # article — URL identique à WordPress
    rubrique/[cat]/      # pages rubriques
    articles/            # liste paginée
    recherche/           # recherche instantanée côté client
scripts/                 # récupération WP, génération OpenAI, images, batch
data/wp-posts.json       # métadonnées source (slug, titre, image, date)
public/media/            # images optimisées
```

## Déploiement

Cloudflare Pages est connecté au dépôt GitHub. Chaque push déclenche un build
(`npm run build`, sortie `dist/`). Le domaine `direct-achatdiscount.com` est géré
sur Cloudflare (redirection `apex → www`). Tant que les DNS ne sont pas délégués,
la préprod est disponible sur l'URL `*.pages.dev`.
