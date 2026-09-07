// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { SITE } from './src/config';
import { RECHNER } from './src/data/rechner';

/**
 * Änderungsdatum je Seite für die Sitemap. Die Daten stehen ohnehin schon in der
 * Rechner-Registry (`updated`) und im Frontmatter der Artikel — hier werden sie
 * nur eingesammelt, damit Google ein echtes Aktualitätssignal bekommt statt
 * eines pauschalen Build-Datums.
 */
const letzteAenderung = new Map<string, string>();

for (const r of RECHNER) {
  letzteAenderung.set(`/rechner/${r.slug}`, r.updated);
}

const ratgeberOrdner = new URL('./src/content/ratgeber/', import.meta.url);
for (const datei of readdirSync(ratgeberOrdner)) {
  if (!datei.endsWith('.md')) continue;
  const inhalt = readFileSync(new URL(datei, ratgeberOrdner), 'utf8');
  const treffer =
    inhalt.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m) ??
    inhalt.match(/^pubDate:\s*(\d{4}-\d{2}-\d{2})/m);
  if (treffer) {
    letzteAenderung.set(`/ratgeber/${datei.replace(/\.md$/, '')}`, treffer[1]);
  }
}

// https://astro.build
export default defineConfig({
  site: SITE.url,
  /**
   * 'never' statt 'ignore': Jede Seite ist damit unter genau einer Schreibweise
   * erreichbar — ohne abschließenden Schrägstrich, passend zum canonical-Tag,
   * zur Sitemap und zu Cloudflare Pages. Bei 'ignore' entstanden zwei Adressen
   * pro Seite, die Google als getrennte URLs behandelt hat.
   */
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [
    sitemap({
      serialize(eintrag) {
        const url = new URL(eintrag.url);
        const pfad = url.pathname.replace(/\/$/, '');

        /**
         * Die Sitemap muss dieselbe Schreibweise melden wie das canonical-Tag der
         * Seite, sonst erklärt sich jede aus der Sitemap geholte URL selbst für
         * nicht-kanonisch. BaseLayout setzt das canonical ohne abschließenden
         * Schrägstrich — die Sitemap zieht hier nach. Nur die Startseite behält
         * ihren Schrägstrich, weil "https://dachundbeet.de" ohne Pfad ungültig wäre.
         */
        eintrag.url = pfad === '' ? `${url.origin}/` : `${url.origin}${pfad}`;

        const datum = letzteAenderung.get(pfad);
        if (datum) eintrag.lastmod = new Date(`${datum}T00:00:00Z`);
        return eintrag;
      },
    }),
  ],
  build: {
    // Clean directory URLs (rechner/pv-solar/index.html) so it works on plain
    // static webspace (IONOS) without server rewrites.
    format: 'directory',
  },
});
