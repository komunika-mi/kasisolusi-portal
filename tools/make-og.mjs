/* Membuat kartu OG 1200x630 sekali jalan, hasilnya disimpan di public/assets/.
   Dijalankan manual: npm i --no-save sharp && node tools/make-og.mjs
   Sharp tidak dibutuhkan saat build biasa. */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets');

const iconB64 = (await readFile(join(OUT, 'icon.png'))).toString('base64');

const card = ({ kicker, title, sub }) => `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3d84f0" stop-opacity=".30"/>
      <stop offset="55%" stop-color="#3d84f0" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glow2" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#3d84f0" stop-opacity=".16"/>
      <stop offset="50%" stop-color="#3d84f0" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#0f0e0b"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>

  <!-- pita biru atas -->
  <rect x="0" y="0" width="1200" height="8" fill="#3d84f0"/>

  <!-- garis rambut -->
  <rect x="80" y="188" width="1040" height="1" fill="#332e20"/>
  <rect x="80" y="470" width="1040" height="1" fill="#332e20"/>

  <!-- lockup merek -->
  <image x="80" y="76" width="64" height="64" xlink:href="data:image/png;base64,${iconB64}"/>
  <text x="164" y="122" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#f5f1e6" letter-spacing="-1.4">kas<tspan fill="#3d84f0">i</tspan>solusi</text>

  <!-- kicker -->
  <text x="80" y="240" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="#8a8474" letter-spacing="4.2">${kicker}</text>

  <!-- judul -->
  ${title.map((line, i) =>
    `<text x="80" y="${318 + i * 74}" font-family="Georgia, Times New Roman, serif" font-size="66" font-weight="700" fill="#f5f1e6" letter-spacing="-2">${line}</text>`
  ).join('\n  ')}

  <!-- kaki -->
  <text x="80" y="522" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="23" fill="#c3bca8">${sub}</text>
  <rect x="80" y="556" width="150" height="4" fill="#3d84f0"/>
  <text x="1120" y="522" text-anchor="end" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="21" font-weight="600" fill="#8a8474">PT Kasisolusi Usaha Indonesia</text>
</svg>`;

const jobs = [
  {
    file: 'og-default.png',
    kicker: 'PORTAL BERITA &amp; PODCAST BISNIS',
    title: ['Bantuin UMKM naik kelas', 'dengan belajar lewat podcast'],
    sub: 'Tayang tiap hari pukul 20.00 WIB di YouTube dan Spotify',
  },
];

for (const j of jobs) {
  const svg = card(j);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(OUT, j.file));
  console.log('dibuat:', j.file);
}

// Ikon persegi 512 untuk PWA/schema.
await sharp(join(OUT, 'icon.png')).resize(512, 512, { fit: 'cover' }).png().toFile(join(OUT, 'icon-512.png'));
console.log('dibuat: icon-512.png');
