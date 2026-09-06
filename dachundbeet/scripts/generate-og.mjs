/**
 * Erzeugt die Open-Graph-Vorschaubilder (1200x630 PNG) in public/og/.
 *
 * Aufruf:  node scripts/generate-og.mjs
 *
 * Die Bilder werden einmalig erzeugt und ins Repo eingecheckt; sie ändern sich
 * nur, wenn Marke oder Farben angepasst werden. Bewusst ohne Zahlenangaben,
 * damit sie nicht veralten, wenn Rechner dazukommen.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'og');

const FARBE = {
  creme: '#faf6ec',
  cremeDunkel: '#f4eede',
  text: '#2b2620',
  gedaempft: '#6c6558',
  gruen: '#2f6b45',
  terra: '#c1512c',
  gold: '#d99f28',
};

/** Logo-Marke aus favicon.svg, auf 32x32-Raster gezeichnet */
const marke = `
  <g transform="translate(88,74) scale(3.1)">
    <rect width="32" height="32" rx="7" fill="${FARBE.gruen}"/>
    <path d="M6 15 L16 7 L26 15" fill="none" stroke="${FARBE.gold}" stroke-width="2.6"
          stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M16 25 L16 17" fill="none" stroke="#f4efe3" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M16 19 C16 16 13 15 11 15.5 C11 18.5 13.5 20 16 19 Z" fill="${FARBE.terra}"/>
    <path d="M16 21 C16 18.5 19 17.5 21 18 C21 20.5 18.5 22 16 21 Z" fill="${FARBE.gold}"/>
  </g>`;

const karte = ({ titel, unterzeile, akzent }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g1" cx="12%" cy="0%" r="62%">
      <stop offset="0%" stop-color="#e5efe8"/>
      <stop offset="100%" stop-color="${FARBE.creme}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="98%" cy="4%" r="58%">
      <stop offset="0%" stop-color="#f6ecd0"/>
      <stop offset="100%" stop-color="${FARBE.creme}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="${FARBE.creme}"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>

  ${marke}

  <text x="212" y="132" font-family="DejaVu Sans" font-size="58" font-weight="bold"
        fill="${FARBE.text}">Dach &amp; Beet</text>
  <text x="215" y="176" font-family="DejaVu Sans" font-size="21" letter-spacing="3.5"
        fill="${FARBE.gedaempft}">HAUS &#183; ENERGIE &#183; GARTEN</text>

  <text x="88" y="356" font-family="DejaVu Sans" font-size="66" font-weight="bold"
        fill="${akzent}">${titel}</text>
  <text x="88" y="424" font-family="DejaVu Sans" font-size="32"
        fill="${FARBE.gedaempft}">${unterzeile}</text>

  <text x="88" y="548" font-family="DejaVu Sans" font-size="30" font-weight="bold"
        fill="${FARBE.gruen}">dachundbeet.de</text>

  <rect x="0" y="606" width="400" height="24" fill="${FARBE.gruen}"/>
  <rect x="400" y="606" width="400" height="24" fill="${FARBE.gold}"/>
  <rect x="800" y="606" width="400" height="24" fill="${FARBE.terra}"/>
</svg>`;

const varianten = {
  standard: {
    titel: 'Rechner, die rechnen',
    unterzeile: 'Kostenlos, sofort im Browser, ohne Anmeldung',
    akzent: FARBE.gruen,
  },
  energie: {
    titel: 'Energie-Rechner',
    unterzeile: 'Solar, W&#228;rmepumpe, Strom und Ladekosten',
    akzent: FARBE.gruen,
  },
  garten: {
    titel: 'Garten-Rechner',
    unterzeile: 'Hochbeet, Rasen, Pool, Zisterne und Kompost',
    akzent: FARBE.gruen,
  },
  haus: {
    titel: 'Haus-Rechner',
    unterzeile: 'D&#228;mmung, Heizlast, Material und Brennholz',
    akzent: FARBE.terra,
  },
};

await mkdir(outDir, { recursive: true });

for (const [name, daten] of Object.entries(varianten)) {
  const svg = karte(daten);
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(outDir, `${name}.png`), png);
  console.log(`og/${name}.png  ${(png.length / 1024).toFixed(0)} KB`);
}
