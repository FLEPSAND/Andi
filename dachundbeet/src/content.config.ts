import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Ratgeber-Artikel als Markdown.
 * NEUEN ARTIKEL HINZUFÜGEN: einfach eine .md-Datei in src/content/ratgeber/
 * anlegen (mit Frontmatter unten). Übersicht, Detailseite und Sitemap entstehen
 * automatisch.
 */
const ratgeber = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ratgeber' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    icon: z.string(),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** optional: slug eines passenden Rechners für die Verlinkung */
    rechner: z.string().optional(),
    seoTitle: z.string().optional(),
  }),
});

export const collections = { ratgeber };
