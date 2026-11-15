/* Audit statis dist/: tautan mati, meta wajib, JSON-LD, gambar, judul unik. */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const problems = [];
const notes = [];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const html = files.filter((f) => f.endsWith('.html'));
const routes = new Set(
  html.map((f) => {
    const r = '/' + relative(DIST, f).split(sep).join('/').replace(/\.html$/, '');
    return r === '/index' ? '/' : r;
  })
);
const assets = new Set(files.map((f) => '/' + relative(DIST, f).split(sep).join('/')));

const titles = new Map();
const descs = new Map();
let checkedLinks = 0;

for (const f of html) {
  const src = await readFile(f, 'utf8');
  const route = '/' + relative(DIST, f).split(sep).join('/').replace(/\.html$/, '');
  const r = route === '/index' ? '/' : route;

  // --- meta wajib ---
  const need = [
    [/<title>([^<]+)<\/title>/, 'title'],
    [/<meta name="description" content="([^"]+)"/, 'description'],
    [/<link rel="canonical" href="([^"]+)"/, 'canonical'],
    [/<meta property="og:title" content="([^"]+)"/, 'og:title'],
    [/<meta property="og:description" content="([^"]+)"/, 'og:description'],
    [/<meta property="og:image" content="([^"]+)"/, 'og:image'],
    [/<meta property="og:url" content="([^"]+)"/, 'og:url'],
    [/<meta property="og:type" content="([^"]+)"/, 'og:type'],
    [/<meta property="og:site_name" content="([^"]+)"/, 'og:site_name'],
    [/<meta property="og:locale" content="([^"]+)"/, 'og:locale'],
    [/<meta name="twitter:card" content="([^"]+)"/, 'twitter:card'],
    [/<meta name="twitter:image" content="([^"]+)"/, 'twitter:image'],
    [/<meta name="viewport" content="([^"]+)"/, 'viewport'],
  ];
  for (const [re, name] of need) {
    const m = src.match(re);
    if (!m) problems.push(`${r}: tidak ada ${name}`);
    else if (name === 'title') {
      if (m[1].length > 68) notes.push(`${r}: title ${m[1].length} karakter (>68)`);
      titles.set(m[1], (titles.get(m[1]) || 0) + 1);
    } else if (name === 'description') {
      if (m[1].length > 175) notes.push(`${r}: description ${m[1].length} karakter (>175)`);
      if (m[1].length < 50) notes.push(`${r}: description hanya ${m[1].length} karakter`);
      descs.set(m[1], (descs.get(m[1]) || 0) + 1);
    } else if (name.startsWith('og:image') || name === 'twitter:image') {
      if (!/^https?:\/\//.test(m[1])) problems.push(`${r}: ${name} bukan URL absolut -> ${m[1]}`);
    } else if (name === 'og:url' || name === 'canonical') {
      if (!/^https?:\/\//.test(m[1])) problems.push(`${r}: ${name} bukan URL absolut`);
    }
  }

  // --- lang & struktur ---
  if (!/<html lang="id">/.test(src)) problems.push(`${r}: <html lang> bukan id`);
  const h1 = src.match(/<h1[\s>]/g) || [];
  if (h1.length === 0) problems.push(`${r}: tidak ada h1`);
  if (h1.length > 1) problems.push(`${r}: ada ${h1.length} h1`);
  if (!/<main id="main">/.test(src)) problems.push(`${r}: tidak ada <main id="main">`);
  if (!/class="skip"/.test(src)) problems.push(`${r}: tidak ada skip link`);

  // --- JSON-LD valid? ---
  for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { problems.push(`${r}: JSON-LD tidak valid (${e.message})`); }
  }

  // --- tautan internal ---
  for (const m of src.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    checkedLinks++;
    if (assets.has(href)) continue;
    if (routes.has(href)) continue;
    if (href === '/') continue;
    problems.push(`${r}: tautan mati -> ${href}`);
  }

  // --- gambar wajib punya dimensi & alt ---
  for (const m of src.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\balt=/.test(tag)) problems.push(`${r}: <img> tanpa alt -> ${tag.slice(0, 90)}`);
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      problems.push(`${r}: <img> tanpa width/height (risiko CLS) -> ${tag.slice(0, 90)}`);
    }
  }

  // --- tombol ikon wajib punya label ---
  for (const m of src.matchAll(/<button\b[^>]*>/g)) {
    if (!/aria-label=/.test(m[0]) && !/data-share=/.test(m[0]) && !/data-filter=/.test(m[0]) && !/data-more=/.test(m[0])) {
      notes.push(`${r}: <button> tanpa aria-label -> ${m[0].slice(0, 80)}`);
    }
  }

  // --- target _blank wajib rel=noopener ---
  for (const m of src.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) problems.push(`${r}: target=_blank tanpa rel=noopener`);
  }
}

// --- judul & deskripsi duplikat ---
for (const [t, n] of titles) if (n > 1) problems.push(`title duplikat (${n}x): ${t}`);
for (const [d, n] of descs) if (n > 1) notes.push(`description duplikat (${n}x): ${d.slice(0, 70)}...`);

// --- berkas wajib ---
for (const f of ['/sitemap.xml', '/robots.txt', '/rss.xml', '/search-index.json', '/styles.css', '/app.js', '/404.html', '/assets/icon.png']) {
  if (!assets.has(f)) problems.push(`berkas hilang: ${f}`);
}

// --- sitemap konsisten dengan halaman ---
const sm = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
const smUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
for (const r of routes) {
  // /wellness: landing page D.V.N yang masih draft menurut panduannya, sengaja noindex.
  if (['/404', '/cari', '/wellness'].includes(r)) continue;
  if (!smUrls.includes(r)) problems.push(`sitemap: ${r} tidak terdaftar`);
}
for (const u of smUrls) if (!routes.has(u)) problems.push(`sitemap: ${u} tidak punya halaman`);

console.log(`Halaman   : ${html.length}`);
console.log(`Rute      : ${routes.size}`);
console.log(`Tautan    : ${checkedLinks} diperiksa`);
console.log(`Sitemap   : ${smUrls.length} URL`);
console.log('');
if (problems.length) {
  console.log(`MASALAH (${problems.length}):`);
  problems.slice(0, 60).forEach((p) => console.log('  x ' + p));
  if (problems.length > 60) console.log(`  ... dan ${problems.length - 60} lagi`);
} else console.log('MASALAH   : tidak ada');
console.log('');
if (notes.length) {
  console.log(`CATATAN (${notes.length}):`);
  [...new Set(notes)].slice(0, 25).forEach((p) => console.log('  - ' + p));
}
process.exit(problems.length ? 1 : 0);
