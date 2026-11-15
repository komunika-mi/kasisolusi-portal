/* Kasisolusi - static site generator. `node build.mjs` -> dist/ */
import { mkdir, writeFile, rm, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site, pillars, programs, reasons, WELLNESS_TAYANG } from './data/site.mjs';
import { episodes } from './data/episodes.mjs';
import { articles } from './data/articles.mjs';
import { news } from './data/news.mjs';
import { shorts, kbi, produk } from './data/ekosistem.mjs';
import { kbiPage, detailInvestment } from './data/kbi.mjs';
import {
  head, esc, abs, orgLd, websiteLd, breadcrumbLd,
  podcastSeriesLd, podcastEpisodeLd, newsArticleLd,
} from './src/seo.mjs';
import {
  header, footer, icon, kanal, kanalList, kanalName, kanalColor, kanalLabel,
  thumbUrl, thumbImg, ncard, ecard, eprow, rankItem,
  tanggal, durasi, durasiMenit, tonton,
} from './src/ui.mjs';
import { kbiMain, schoolsBlock, programBlock, detailMain } from './src/kbi.mjs';
import { bacaBeritaOtomatis, waktuTerbit } from './src/berita-otomatis.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const NOW = new Date();

/* ---------------------------------------------------------------- utils */
const slugify = (s) =>
  s.toLowerCase()
    .replace(/["'’“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');

const written = [];
async function page(path, html) {
  const file = path === '/' ? 'index.html' : `${path.replace(/^\//, '')}.html`;
  const full = join(DIST, file);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, html, 'utf8');
  written.push(path);
}

const doc = (headHtml, body) => `<!doctype html>
<html lang="id">
<head>${headHtml}
  <script>document.documentElement.className+=' js'</script>
</head>
<body>
${body}
<script src="/app.js" defer></script>
</body>
</html>`;

/* ---------------------------------------------------------------- data */
const EPISODES = episodes
  .map((e) => ({ ...e, slug: slugify(e.title) }))
  .sort((a, b) => (a.date < b.date ? 1 : -1));
const epById = Object.fromEntries(EPISODES.map((e) => [e.id, e]));

const ARTICLES = articles.map((a) => {
  const ep = epById[a.episodeId];
  if (!ep) throw new Error(`artikel ${a.slug} menunjuk episode yang tidak ada: ${a.episodeId}`);
  return { ...a, episode: ep };
});

const dupes = EPISODES.map((e) => e.slug).filter((s, i, arr) => arr.indexOf(s) !== i);
if (dupes.length) throw new Error(`slug episode bentrok: ${dupes.join(', ')}`);

// Berita otomatis (data/berita/*.json, ditulis otomasi/jalan.mjs, lihat README). Berkas
// yang cacat menggagalkan build supaya ketahuan, bukan dilewati diam-diam.
const BERITA_OTOMATIS = (() => {
  const { berita, galat } = bacaBeritaOtomatis(join(ROOT, 'data', 'berita'), { publicDir: join(ROOT, 'public') });
  if (galat.length) throw new Error(`berita otomatis cacat:\n  ${galat.join('\n  ')}`);
  return berita;
})();

// Berita (update news, data/news.mjs + data/berita/*.json): tampil lebih dulu daripada rangkuman
// podcast (keputusan pengguna 25 Okt 2026: "news dulu baru bawahnya podcast", beranda ikut).
// jenis di sini selalu 'berita' karena menentukan kolam bacaan lanjutan; tips otomatis ikut kolam berita.
const kataDi = (a) => [...a.body.map((b) => b.text), ...a.takeaways].join(' ').split(/\s+/).length;
const NEWS = [...news, ...BERITA_OTOMATIS]
  .map((n) => ({ ...n, jenis: 'berita', readMinutes: n.readMinutes || Math.max(1, Math.ceil(kataDi(n) / 200)) }))
  // terbaru dulu (berita otomatis memakai jam `dibuat`); waktu sama mengikuti urutan di data/news.mjs
  .sort((a, b) => waktuTerbit(b) - waktuTerbit(a));
const SEMUA = [...NEWS, ...ARTICLES];
const slugBentrok = SEMUA.map((a) => a.slug).filter((s, i, arr) => arr.indexOf(s) !== i);
if (slugBentrok.length) throw new Error(`slug artikel/berita bentrok: ${slugBentrok.join(', ')}`);
for (const n of NEWS) if (!kanal[n.kanal]) throw new Error(`berita ${n.slug}: kanal tidak dikenal ${n.kanal}`);
// Gambar artikel: sampul lokal untuk berita, thumbnail episode untuk rangkuman podcast.
const gambarArtikel = (a) => (a.img ? a.img : thumbUrl(a.episode.id, 'maxresdefault'));

// Keputusan pengguna 26 Okt 2026: News (beranda, /berita, kanal) HANYA berisi berita;
// rangkuman podcast pindah ke halaman Podcast (bagian "Rangkuman Episode"), URL tetap /berita/<slug>.
const byKanal = (k) => NEWS.filter((a) => a.kanal === k);
const epByKanal = (k) => EPISODES.filter((e) => e.kanal === k);
const epByProgram = (p) => EPISODES.filter((e) => e.program === p);
const populer = [...EPISODES].sort((a, b) => b.views - a.views);

// Bacaan lanjutan dari jenis yang sama: berita ke berita, rangkuman podcast ke rangkuman.
const readMoreFor = (a) => {
  const pool = a.jenis === 'berita' ? NEWS : ARTICLES;
  const same = pool.filter((x) => x.kanal === a.kanal && x.slug !== a.slug);
  return (same.length ? same : pool.filter((x) => x.slug !== a.slug)).slice(0, 3);
};

/* ---------------------------------------------------------------- potongan bersama */
const shell = (current, main) => `${header(current)}<main id="main">${main}</main>${footer()}`;

const crumbs = (items, { light = false } = {}) => `
  <nav class="crumbs${light ? ' crumbs--light' : ''}" aria-label="Remah roti">
    ${items.map((c, i) => (i === items.length - 1
      ? `<span aria-current="page">${esc(c.name)}</span>`
      : `<a href="${c.path}">${esc(c.name)}</a>${icon('chev')}`)).join('')}
  </nav>`;

const phero = ({ bc, eyebrow = '', title, desc = '', extra = '', actions = '', cls = '' }) => `
<section class="phero${cls ? ` ${cls}` : ''}">
  <div class="wrap">
    ${bc ? crumbs(bc) : ''}
    <div style="margin-top:var(--s-5)">${eyebrow}</div>
    <h1 class="phero__t">${title}</h1>
    ${desc ? `<p class="phero__d">${desc}</p>` : ''}
    ${extra}
    ${actions ? `<div class="phero__a">${actions}</div>` : ''}
  </div>
</section>`;

const eyebrow = (t) => `<p class="eyebrow">${esc(t)}</p>`;

const ytPlayer = (ep, { eager = false } = {}) => `
  <div class="player" data-yt="${ep.id}" data-yt-title="${esc(ep.title)}" role="button" tabindex="0" aria-label="Putar episode: ${esc(ep.title)}">
    <img src="${thumbUrl(ep.id, 'maxresdefault')}" width="1280" height="720" alt="Thumbnail episode ${esc(ep.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    <span class="media__play">${icon('play')}</span>
  </div>`;

const shareRow = () => `
  <div class="share" role="group" aria-label="Bagikan halaman ini">
    <button class="share__b" type="button" data-share="wa" aria-label="Bagikan ke WhatsApp">${icon('wa')}</button>
    <button class="share__b" type="button" data-share="x" aria-label="Bagikan ke X">${icon('x')}</button>
    <button class="share__b" type="button" data-share="salin" aria-label="Salin tautan">${icon('link')}</button>
  </div>`;

const platformRow = () => {
  const yt = site.social.find((s) => s.icon === 'youtube');
  const sp = site.social.find((s) => s.icon === 'spotify');
  return `
  <div class="platforms">
    <a class="platform" href="${yt.url}" target="_blank" rel="noopener">${icon('youtube')} Tonton di YouTube</a>
    <a class="platform" href="${sp.url}" target="_blank" rel="noopener">${icon('spotify')} Dengar di Spotify</a>
  </div>`;
};

const sidebarPopuler = ({ sticky = true } = {}) => `
  <aside class="panel${sticky ? ' sticky' : ''}">
    <p class="panel__h">Paling banyak ditonton</p>
    <div>${populer.slice(0, 5).map((e, i) => rankItem({ title: e.title, href: `/podcast/${e.slug}`, metaText: `${tonton(e.views)} tayangan` }, i)).join('')}</div>
  </aside>`;

const programPanel = () => `
  <div class="panel" style="margin-top:var(--s-4)">
    <p class="panel__h">Program Kasisolusi</p>
    <ul class="panel__list">
      ${programs.map((p) => `<li><a href="/program/${p.slug}">${esc(p.name)}</a><small>${epByProgram(p.slug).length} episode di portal</small></li>`).join('')}
    </ul>
  </div>`;

const filterChips = (target, counts, total, label) => `
  <div class="kstrip" data-filter-group="${target}" role="group" aria-label="${esc(label)}">
    <button class="chip" type="button" data-filter="semua" aria-pressed="true">Semua <span>${total}</span></button>
    ${kanalList.map((k) => `<button class="chip" type="button" data-filter="${k.slug}" aria-pressed="false">${esc(k.name)} <span>${counts(k.slug)}</span></button>`).join('')}
  </div>
  <p class="sr" role="status" aria-live="polite" data-filter-status></p>`;

/* ---------------------------------------------------------------- 1. Beranda */
async function buildHome() {
  const latest = EPISODES[0];
  const others = EPISODES.slice(1, 5);
  // Revisi tracker 23 Sep 2026: berita terbaru jadi hero paling atas, lalu daftar
  // "Ramai Dibicarakan" (tanpa mengulang artikel hero), lalu podcast. Sejak 25 Okt 2026
  // berita (NEWS) didahulukan, rangkuman podcast menyusul.
  const [lead, ...sideNews] = NEWS.slice(0, 4);
  const news = NEWS.slice(4, 10);
  const foto = (a, opts) => (a.img
    ? `<img src="${a.img}" width="1280" height="720" alt="" ${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
    : thumbImg(a.episode.id, opts));
  // Jumlah berita bisa sedikit (awal otomasi) atau nol: hero hanya tampil bila ada berita, kolom
  // samping hanya bila ada lebih dari satu, dan "Ramai Dibicarakan" hanya bila ada sisa sesudah hero.
  const heroBerita = !lead ? '' : `
<section class="nhero" id="berita-utama" aria-labelledby="nhero-h">
  <div class="wrap">
    <div class="nhero__head">
      <h2 class="eyebrow nhero__h" id="nhero-h">Berita Terbaru</h2>
      <a class="linkarrow" href="/berita">Semua Berita ${icon('arrow')}</a>
    </div>
    <div class="nhero__grid"${sideNews.length ? '' : ' style="grid-template-columns:minmax(0,1fr);max-width:760px"'}>
      <article class="nlead">
        <span class="media nlead__media">${foto(lead, { sizes: '(max-width:960px) 100vw, 720px', eager: true, alt: '' })}</span>
        <div class="nlead__top">${kanalLabel(lead.kanal)}<span>${tanggal(lead.date)}</span></div>
        <h3 class="nlead__t"><a href="/berita/${lead.slug}">${esc(lead.title)}</a></h3>
        <p class="nlead__d">${esc(lead.dek)}</p>
        <p class="nlead__m">${lead.readMinutes} menit baca${lead.episode?.guest ? ` · Rangkuman episode bersama ${esc(lead.episode.guest)}` : ''}</p>
      </article>${sideNews.length ? `
      <div class="nside">
        ${sideNews.map((x) => `
        <article class="nrow">
          <span class="media">${foto(x, { sizes: '(max-width:640px) 40vw, 180px' })}</span>
          <div>
            <div class="nrow__top">${kanalLabel(x.kanal)}</div>
            <h3 class="nrow__t"><a href="/berita/${x.slug}">${esc(x.title)}</a></h3>
            <p class="nrow__m">${tanggal(x.date)}</p>
          </div>
        </article>`).join('')}
      </div>` : ''}
    </div>
  </div>
</section>`;
  const ramai = !news.length ? '' : `
<section class="section bg-soft" id="news">
  <div class="wrap">
    <div class="shead">
      <div>
        ${eyebrow('News & Insights')}
        <h2 class="shead__t">Ramai Dibicarakan</h2>
      </div>
      <a class="linkarrow" href="/berita">Lihat Semua Berita ${icon('arrow')}</a>
    </div>
    <div class="grid grid--3">${news.map((a) => ncard(a)).join('')}</div>
  </div>
</section>`;
  const main = `
<h1 class="sr">${esc(site.name)} - Portal Berita &amp; Podcast Bisnis UMKM</h1>${heroBerita}
${ramai}

<section class="section" id="podcast">
  <div class="wrap">
    <div class="shead">
      <div>
        ${eyebrow('Podcast')}
        <h2 class="shead__t">Kasisolusi Podcast</h2>
        <p class="shead__d">${esc(site.schedule)} di YouTube dan Spotify.</p>
      </div>
      <a class="linkarrow" href="/podcast">Lihat Semua Episode ${icon('arrow')}</a>
    </div>
    <div class="pod">
      <article class="feat rv">
        <div class="media feat__media" data-yt="${latest.id}" data-yt-title="${esc(latest.title)}" role="button" tabindex="0" aria-label="Putar episode terbaru: ${esc(latest.title)}">
          ${thumbImg(latest.id, { sizes: '(max-width:960px) 100vw, 720px', alt: `Thumbnail episode ${latest.title}` })}
          <span class="media__play">${icon('play')}</span>
          <span class="media__dur">${durasi(latest.seconds)}</span>
        </div>
        <div class="feat__top"><span class="pill">Episode terbaru</span>${kanalLabel(latest.kanal)}</div>
        <h3 class="feat__t"><a href="/podcast/${latest.slug}">${esc(latest.title)}</a></h3>
        ${latest.guest ? `<p class="feat__guest">Bersama ${esc(latest.guest)}</p>` : ''}
        <div class="meta"><span>${tanggal(latest.date)}</span><span>${durasiMenit(latest.seconds)}</span><span>${tonton(latest.views)} tayangan</span></div>
      </article>
      <div>
        <p class="eplist__h">Episode Lainnya</p>
        ${others.map((e) => eprow(e)).join('')}
      </div>
    </div>
  </div>
</section>

<section class="section bg-navy" id="ikuti">
  <div class="wrap daily">
    <div>
      ${eyebrow('Kasisolusi Hari Ini')}
      <h2 class="daily__t">Dari Obrolan, Jadi Pelajaran</h2>
      <p class="daily__d">Bingung mulai dari episode mana? Intip cuplikan pilihan, temukan insight yang paling relate, lalu lanjut tonton episode lengkapnya.</p>
      <div class="daily__cta">
        <a class="btn btn--white" href="${site.social.find((s) => s.icon === 'instagram').url}" target="_blank" rel="noopener">${icon('instagram')} Follow Instagram ${icon('arrow')}</a>
        <a class="btn btn--white" href="${site.social.find((s) => s.icon === 'tiktok').url}" target="_blank" rel="noopener">${icon('tiktok')} Follow TikTok ${icon('arrow')}</a>
      </div>
    </div>
    <div>
      <div class="tiles">
        ${shorts.map((s) => `
        <a class="tile rv" href="https://www.youtube.com/shorts/${s.id}" target="_blank" rel="noopener">
          <img src="https://i.ytimg.com/vi/${s.id}/oar2.jpg" width="270" height="480" alt="" loading="lazy" decoding="async">
          <span class="tile__icon">${icon('shorts')}</span>
          <span class="tile__t">${esc(s.title)}</span>
          <span class="tile__v">${icon('play')} ${esc(s.views)}</span>
        </a>`).join('')}
      </div>
      <p class="daily__note">Cuplikan terpopuler dari YouTube Shorts Kasisolusi.</p>
    </div>
  </div>
</section>

<section class="section kb-home" id="kelas">
  <div class="wrap">
    ${schoolsBlock({ h: 'h2', label: kbi.name, link: `<a class="linkarrow" href="/kelas">Lihat Halaman KBI ${icon('arrow')}</a>` })}
    <div class="kb-home__program">${programBlock({ now: NOW, h: 'h3' })}</div>
  </div>
</section>

<section class="section bg-soft" id="produk">
  <div class="wrap">
    <div class="shead">
      <div>
        ${eyebrow('Produk Kasisolusi')}
        <h2 class="shead__t">Buku &amp; Kelas Pilihan</h2>
        <p class="shead__d">Buku, rekaman kelas, dan workshop bersama mentor dan narasumber Kasisolusi. Detail, harga, dan pembelian ada di toko resmi Kasisolusi di Lynk.id.</p>
      </div>
      <a class="linkarrow" href="${produk.store}" target="_blank" rel="noopener">Lihat Semua di Lynk.id ${icon('external')}</a>
    </div>
    <div class="pgrid">
      ${produk.items.map((p) => `
      <article class="pcard rv">
        <span class="pcard__img"><img src="${p.img}" width="600" height="600" alt="Sampul ${esc(p.nama)}" loading="lazy" decoding="async"></span>
        <div class="pcard__body">
          <p class="pcard__type">${esc(p.jenis)}</p>
          <h3 class="pcard__t"><a href="${p.url}" target="_blank" rel="noopener">${esc(p.nama)}<span class="sr"> (buka di Lynk.id)</span></a></h3>
          <span class="pcard__cta">Lihat di Lynk.id ${icon('external')}</span>
        </div>
      </article>`).join('')}
    </div>
    <div class="pmore"><a class="btn btn--blue" href="${produk.store}" target="_blank" rel="noopener">Lihat Semua di Lynk.id ${icon('external')}</a></div>
  </div>
</section>`;

  await page('/', doc(head({
    title: `${site.name} - Portal Berita & Podcast Bisnis UMKM`,
    description: site.description,
    path: '/',
    jsonld: [orgLd(), websiteLd()],
  }), shell('/', main)));
}

/* ---------------------------------------------------------------- 2. News */
async function buildBerita() {
  const bc = [{ name: 'Beranda', path: '/' }, { name: 'News', path: '/berita' }];
  const main = `
${phero({
    bc,
    eyebrow: eyebrow('News & Insights'),
    // Revisi Ricky (WA 20 Okt 2026): samakan dengan judul section berita di beranda.
    title: 'Ramai Dibicarakan',
    desc: 'Berita terbaru seputar UMKM, bisnis, dan ekonomi untuk pelaku usaha Indonesia.',
  })}
<section class="section--tight">
  <div class="wrap">
    ${filterChips('#feed', (k) => byKanal(k).length, NEWS.length, 'Saring berita berdasarkan kanal')}
    <h2 class="sr">Daftar berita</h2>
    <div class="grid grid--3" id="feed" style="margin-top:var(--s-5)">
      ${NEWS.map((a, i) => `<div data-kanal="${a.kanal}"${i >= 12 ? ' data-hidden="true" hidden' : ''}>${ncard(a, { eager: i < 3 })}</div>`).join('')}
    </div>
    ${NEWS.length ? '<p class="empty" data-empty hidden>Belum ada berita di kanal ini.</p>' : '<p class="empty" data-empty>Belum ada berita.</p>'}
    ${NEWS.length > 12 ? '<div class="more"><button class="btn btn--line" type="button" data-more="#feed" data-more-step="6">Muat lagi</button></div>' : ''}
  </div>
</section>`;

  await page('/berita', doc(head({
    title: 'News & Insights',
    description: 'Kumpulan berita Kasisolusi seputar bisnis, keuangan, marketing, industri kreatif, dan ekonomi untuk UMKM Indonesia.',
    path: '/berita',
    jsonld: [breadcrumbLd(bc)],
  }), shell('/berita', main)));
}

/* ---------------------------------------------------------------- 3. Kanal */
async function buildKanal() {
  for (const k of kanalList) {
    const list = byKanal(k.slug);
    const path = `/berita/kanal/${k.slug}`;
    const bc = [{ name: 'Beranda', path: '/' }, { name: 'News', path: '/berita' }, { name: k.name, path }];

    // Kanal berita hanya memuat berita; episode dan rangkuman podcast ada di halaman Podcast.
    const main = `
${phero({
      bc,
      eyebrow: kanalLabel(k.slug),
      title: esc(k.name),
      desc: esc(k.blurb),
      extra: `<div class="meta" style="margin-top:var(--s-4)"><span>${list.length} berita</span></div>`,
    })}
<section class="section--tight">
  <div class="wrap grid grid--sidebar">
    <div>
      <h2 class="sr">Berita di kanal ${esc(k.name)}</h2>
      ${list.length ? `<div class="grid grid--2">${list.map((a) => ncard(a)).join('')}</div>` : '<p class="empty">Belum ada berita di kanal ini.</p>'}
    </div>
    <aside class="panel sticky">
      <p class="panel__h">Kanal lain</p>
      <ul class="panel__list">
        ${kanalList.filter((x) => x.slug !== k.slug).map((x) => `<li><a href="/berita/kanal/${x.slug}">${esc(x.name)}</a><small>${byKanal(x.slug).length} berita</small></li>`).join('')}
      </ul>
    </aside>
  </div>
</section>`;

    await page(path, doc(head({
      title: `Kanal ${k.name}`,
      description: `${k.blurb} Kumpulan berita Kasisolusi di kanal ${k.name}.`,
      path,
      jsonld: [breadcrumbLd(bc)],
    }), shell('/berita', main)));
  }
}

/* ---------------------------------------------------------------- 4. Artikel */
function renderBody(a) {
  const blocks = a.body.map((b) => {
    if (b.type === 'h2') return `<h2>${esc(b.text)}</h2>`;
    if (b.type === 'quote') return `<blockquote>${esc(b.text)}</blockquote>`;
    return `<p>${esc(b.text)}</p>`;
  });
  const rel = readMoreFor(a)[0];
  if (rel && blocks.length > 4) {
    blocks.splice(3, 0, `<a class="bacajuga" href="/berita/${rel.slug}"><span>Baca juga</span><b>${esc(rel.title)}</b></a>`);
  }
  return blocks.join('\n');
}

async function buildArtikel() {
  for (const a of NEWS) await buildBeritaNews(a);
  for (const a of ARTICLES) {
    // Rangkuman podcast: alamat tetap /berita/<slug> (link lama aman), tetapi sejak
    // 26 Okt 2026 berada di bawah Podcast (remah roti, menu aktif, bacaan lanjutan).
    const path = `/berita/${a.slug}`;
    const k = kanal[a.kanal];
    const bc = [
      { name: 'Beranda', path: '/' },
      { name: 'Podcast', path: '/podcast' },
      { name: 'Rangkuman Episode', path: '/podcast#rangkuman' },
      { name: a.title, path },
    ];
    const rel = readMoreFor(a);

    const main = `
<div class="progress" role="presentation"></div>
<article data-article>
  <header class="wrap narrow" style="padding-top:clamp(1.75rem,1.2rem + 2vw,3rem)">
    ${crumbs(bc, { light: true })}
    <div style="margin-top:var(--s-5)">${kanalLabel(a.kanal)}</div>
    <h1 class="art__h">${esc(a.title)}</h1>
    <p class="lede">${esc(a.dek)}</p>
    <div class="art__bar">
      <div class="meta"><span>Redaksi ${esc(site.name)}</span><span><time datetime="${a.date}">${tanggal(a.date)}</time></span><span>${a.readMinutes} menit baca</span></div>
      ${shareRow()}
    </div>
  </header>

  <div class="wrap narrow" style="margin-top:var(--s-5)">
    <span class="pill">Rangkuman episode</span>
    <div style="margin-top:var(--s-3)">${ytPlayer(a.episode, { eager: true })}</div>
    <p class="meta" style="margin-top:var(--s-3)"><span>Sumber: episode "${esc(a.episode.title)}"</span><span>${durasiMenit(a.episode.seconds)}</span></p>
  </div>

  <div class="wrap narrow prose" style="margin-top:var(--s-6)">${renderBody(a)}</div>

  <div class="wrap narrow" style="margin-top:var(--s-6)">
    <div class="takeaways"><h2>Poin penting</h2><ul>${a.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
  </div>

  <div class="wrap narrow" style="margin-top:var(--s-6)">
    <div class="art__bar" style="margin-top:0"><p style="font-size:.9rem;font-weight:700">Bagikan artikel ini</p>${shareRow()}</div>
  </div>

  <div class="wrap narrow" style="margin-top:var(--s-6);padding-bottom:var(--s-7)">
    <div class="panel">
      <p class="panel__h">Tonton episode lengkapnya</p>
      <h3 style="font-size:1.05rem;line-height:1.3;margin-top:.6rem"><a href="/podcast/${a.episode.slug}">${esc(a.episode.title)}</a></h3>
      <div class="meta" style="margin-top:.5rem"><span>${tanggal(a.episode.date)}</span><span>${durasiMenit(a.episode.seconds)}</span><span>${tonton(a.episode.views)} tayangan</span></div>
      <div style="margin-top:var(--s-4)">${platformRow()}</div>
    </div>
  </div>
</article>

<section class="section bg-soft">
  <div class="wrap">
    <div class="shead"><div>${eyebrow('Rangkuman Episode')}<h2 class="shead__t">Baca berikutnya</h2></div><a class="linkarrow" href="/podcast#rangkuman">Lihat Semua Rangkuman ${icon('arrow')}</a></div>
    <div class="grid grid--3">${rel.map((r) => ncard(r)).join('')}</div>
  </div>
</section>`;

    await page(path, doc(head({
      title: a.title,
      description: a.dek,
      path,
      type: 'article',
      image: thumbUrl(a.episode.id, 'maxresdefault'),
      publishedTime: `${a.date}T09:00:00+07:00`,
      section: k.name,
      jsonld: [newsArticleLd({ ...a, image: thumbUrl(a.episode.id, 'maxresdefault') }), breadcrumbLd(bc)],
    }), shell('/podcast', main)));
  }
}

/** Halaman satu berita (data/news.mjs): sampul lokal, sumber unggahan, video episode bila ada. */
async function buildBeritaNews(a) {
  const path = `/berita/${a.slug}`;
  const k = kanal[a.kanal];
  const bc = [
    { name: 'Beranda', path: '/' },
    { name: 'News', path: '/berita' },
    { name: k.name, path: `/berita/kanal/${a.kanal}` },
    { name: a.title, path },
  ];
  const rel = readMoreFor(a);
  const main = `
<div class="progress" role="presentation"></div>
<article data-article>
  <header class="wrap narrow" style="padding-top:clamp(1.75rem,1.2rem + 2vw,3rem)">
    ${crumbs(bc, { light: true })}
    <div style="margin-top:var(--s-5)">${kanalLabel(a.kanal)}</div>
    <h1 class="art__h">${esc(a.title)}</h1>
    <p class="lede">${esc(a.dek)}</p>
    <div class="art__bar">
      <div class="meta"><span>Redaksi ${esc(site.name)}</span><span><time datetime="${a.date}">${tanggal(a.date)}</time></span><span>${a.readMinutes} menit baca</span></div>
      ${shareRow()}
    </div>
  </header>

  <div class="wrap narrow" style="margin-top:var(--s-5)">
    <figure class="art__fig">
      <img src="${a.img}" width="1280" height="720" alt="${esc(a.imgAlt || a.title)}" fetchpriority="high" decoding="async">
      <figcaption>Foto: ${esc(a.foto || a.sumber[0].label)}</figcaption>
    </figure>
  </div>

  <div class="wrap narrow prose" style="margin-top:var(--s-6)">${renderBody(a)}</div>

  <div class="wrap narrow" style="margin-top:var(--s-6)">
    <div class="takeaways"><h2>Poin penting</h2><ul>${a.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
  </div>

  ${a.video ? `
  <div class="wrap narrow" style="margin-top:var(--s-6)">
    <span class="pill">Tonton episodenya</span>
    <div style="margin-top:var(--s-3)">${ytPlayer({ id: a.video.id, title: a.video.title })}</div>
    <p class="meta" style="margin-top:var(--s-3)"><span>Podcast Kasisolusi: "${esc(a.video.title)}"</span></p>
  </div>` : ''}

  <div class="wrap narrow" style="margin-top:var(--s-6)">
    <div class="art__sumber">
      <p class="panel__h">Sumber</p>
      <ul>${a.sumber.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}<span class="sr"> (tab baru)</span></a></li>`).join('')}</ul>
      ${a.cta ? `<a class="btn btn--blue" href="${a.cta.href}">${esc(a.cta.label)} ${icon('arrow')}</a>` : ''}
    </div>
  </div>

  <div class="wrap narrow" style="margin-top:var(--s-6);padding-bottom:var(--s-7)">
    <div class="art__bar" style="margin-top:0"><p style="font-size:.9rem;font-weight:700">Bagikan berita ini</p>${shareRow()}</div>
  </div>
</article>
${rel.length ? `
<section class="section bg-soft">
  <div class="wrap">
    <div class="shead"><div>${eyebrow('News & Insights')}<h2 class="shead__t">Baca berikutnya</h2></div><a class="linkarrow" href="/berita">Lihat Semua Artikel ${icon('arrow')}</a></div>
    <div class="grid grid--3">${rel.map((r) => ncard(r)).join('')}</div>
  </div>
</section>` : ''}`;

  // Berita otomatis membawa jam terbit (`dibuat`, ISO +07:00); berita lama di news.mjs hanya tanggal.
  const terbit = a.dibuat || `${a.date}T09:00:00+07:00`;
  await page(path, doc(head({
    title: a.title,
    description: a.dek,
    path,
    type: 'article',
    image: a.img,
    publishedTime: terbit,
    section: k.name,
    jsonld: [newsArticleLd({ ...a, date: a.dibuat || a.date, image: a.img, category: k.name }), breadcrumbLd(bc)],
  }), shell('/berita', main)));
}

/* ---------------------------------------------------------------- 5. Podcast */
async function buildPodcast() {
  const bc = [{ name: 'Beranda', path: '/' }, { name: 'Podcast', path: '/podcast' }];
  const main = `
${phero({
    bc,
    eyebrow: eyebrow('Podcast'),
    title: 'Kasisolusi Podcast',
    desc: `${EPISODES.length} episode Kasisolusi di portal ini. ${esc(site.schedule)} di YouTube dan Spotify.`,
    actions: platformRow(),
  })}
<section class="section--tight">
  <div class="wrap">
    ${filterChips('#eps', (k) => epByKanal(k).length, EPISODES.length, 'Saring episode berdasarkan kanal')}
    <div class="grid grid--sidebar" style="margin-top:var(--s-5)">
      <div>
        <h2 class="sr">Daftar episode</h2>
        <div class="grid grid--3" id="eps">
          ${EPISODES.map((e, i) => `<div data-kanal="${e.kanal}"${i >= 12 ? ' data-hidden="true" hidden' : ''}>${ecard(e, { eager: i < 3 })}</div>`).join('')}
        </div>
        <p class="empty" data-empty hidden>Tidak ada episode di kanal ini.</p>
        <div class="more"><button class="btn btn--line" type="button" data-more="#eps" data-more-step="9">Muat lagi</button></div>
      </div>
      <div class="sticky">${sidebarPopuler({ sticky: false })}${programPanel()}</div>
    </div>
  </div>
</section>

<section class="section bg-soft" id="rangkuman">
  <div class="wrap">
    <div class="shead">
      <div>${eyebrow('Rangkuman Episode')}<h2 class="shead__t">Rangkuman Podcast</h2><p class="shead__d shead__d--lebar">Rangkuman editorial dari episode Kasisolusi. Setiap artikel terhubung ke episode aslinya.</p></div>
    </div>
    ${filterChips('#feed', (k) => ARTICLES.filter((a) => a.kanal === k).length, ARTICLES.length, 'Saring rangkuman podcast berdasarkan kanal')}
    <div class="grid grid--3" id="feed" style="margin-top:var(--s-5)">
      ${ARTICLES.map((a, i) => `<div data-kanal="${a.kanal}"${i >= 9 ? ' data-hidden="true" hidden' : ''}>${ncard(a)}</div>`).join('')}
    </div>
    <p class="empty" data-empty hidden>Tidak ada rangkuman di kanal ini.</p>
    <div class="more"><button class="btn btn--line" type="button" data-more="#feed" data-more-step="6">Muat lagi</button></div>
  </div>
</section>`;

  await page('/podcast', doc(head({
    title: 'Podcast',
    description: `Seluruh episode podcast Kasisolusi. ${site.schedule}. Obrolan bisnis bersama pemilik usaha, praktisi, dan pemimpin industri.`,
    path: '/podcast',
    jsonld: [podcastSeriesLd(programs[0]), breadcrumbLd(bc)],
  }), shell('/podcast', main)));
}

/* ---------------------------------------------------------------- 6. Episode */
async function buildEpisodes() {
  for (const [i, e] of EPISODES.entries()) {
    const path = `/podcast/${e.slug}`;
    const prog = programs.find((p) => p.slug === e.program);
    const k = kanal[e.kanal];
    const bc = [{ name: 'Beranda', path: '/' }, { name: 'Podcast', path: '/podcast' }, { name: e.title, path }];
    const related = EPISODES.filter((x) => x.kanal === e.kanal && x.id !== e.id).slice(0, 3);
    const fill = related.length < 3 ? EPISODES.filter((x) => x.id !== e.id && !related.includes(x)).slice(0, 3 - related.length) : [];
    const artikelTerkait = ARTICLES.filter((a) => a.episodeId === e.id);
    const prev = EPISODES[i + 1];
    const next = EPISODES[i - 1];

    const main = `
<article>
${phero({
      bc,
      eyebrow: `<div style="display:flex;gap:.7rem;flex-wrap:wrap;align-items:center">${kanalLabel(e.kanal)}<a class="chip" href="/program/${prog.slug}">${esc(prog.name)}</a></div>`,
      title: esc(e.title),
      extra: `
    <div class="meta" style="margin-top:var(--s-4)">
      <span><time datetime="${e.date}">${tanggal(e.date)}</time></span><span>${durasi(e.seconds)}</span><span>${tonton(e.views)} tayangan</span>${e.guest ? `<span>Bersama ${esc(e.guest)}</span>` : ''}
    </div>
    <div style="margin-top:var(--s-6);max-width:960px">${ytPlayer(e, { eager: true })}</div>`,
    })}
  <section class="section--tight">
    <div class="wrap grid grid--sidebar">
      <div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--s-4);justify-content:space-between;align-items:center;padding-bottom:var(--s-5);border-bottom:1px solid var(--line)">
          ${platformRow()}
          ${shareRow()}
        </div>
        <div class="prose" style="margin-top:var(--s-5)">
          <p class="lede" style="margin-top:0">Episode ${esc(prog.name)} ini tayang pada ${tanggal(e.date)} dengan durasi ${durasiMenit(e.seconds)}${e.guest ? ` bersama ${esc(e.guest)}` : ''}. Pembahasannya masuk ke kanal ${esc(k.name)}.</p>
          <p>${esc(k.blurb)} Tekan tombol putar di atas untuk menonton episode lengkapnya langsung di halaman ini, atau buka versi audionya di Spotify.</p>
        </div>
        ${artikelTerkait.length ? `
        <div class="shead" style="margin-top:var(--s-7);margin-bottom:var(--s-4)"><h2 class="shead__t shead__t--sm">Rangkuman tertulis</h2></div>
        <div class="grid grid--2">${artikelTerkait.map((a) => ncard(a)).join('')}</div>` : ''}
        <nav style="display:flex;gap:var(--s-4);justify-content:space-between;margin-top:var(--s-7);padding-top:var(--s-5);border-top:1px solid var(--line);flex-wrap:wrap" aria-label="Episode sebelumnya dan berikutnya">
          ${next ? `<a class="linkarrow" href="/podcast/${next.slug}">${icon('arrow-left')} Episode lebih baru</a>` : '<span></span>'}
          ${prev ? `<a class="linkarrow" href="/podcast/${prev.slug}">Episode sebelumnya ${icon('arrow')}</a>` : '<span></span>'}
        </nav>
      </div>
      <aside class="panel sticky">
        <p class="panel__h">Detail episode</p>
        <ul class="panel__list">
          <li><small>Program</small><a href="/program/${prog.slug}">${esc(prog.name)}</a></li>
          <li><small>Kanal</small><a href="/berita/kanal/${e.kanal}">${esc(k.name)}</a></li>
          <li><small>Tayang</small>${tanggal(e.date)}</li>
          <li><small>Durasi</small>${durasi(e.seconds)}</li>
        </ul>
      </aside>
    </div>
  </section>
</article>

<section class="section bg-soft">
  <div class="wrap">
    <div class="shead"><div>${eyebrow('Podcast')}<h2 class="shead__t">Episode lain</h2></div><a class="linkarrow" href="/podcast">Lihat Semua Episode ${icon('arrow')}</a></div>
    <div class="grid grid--3">${[...related, ...fill].map((x) => ecard(x)).join('')}</div>
  </div>
</section>`;

    await page(path, doc(head({
      title: e.title,
      description: `Episode ${prog.name} yang tayang ${tanggal(e.date)}${e.guest ? ` bersama ${e.guest}` : ''}. Durasi ${durasiMenit(e.seconds)}. Kanal ${k.name}.`,
      path,
      type: 'video.episode',
      image: thumbUrl(e.id, 'maxresdefault'),
      publishedTime: `${e.date}T20:00:00+07:00`,
      jsonld: [podcastEpisodeLd({ ...e, dek: `Episode ${prog.name} di kanal ${k.name}.` }, prog), breadcrumbLd(bc)],
    }), shell('/podcast', main)));
  }
}

/* ---------------------------------------------------------------- 7. Program */
async function buildProgram() {
  const bc = [{ name: 'Beranda', path: '/' }, { name: 'Program', path: '/program' }];
  const progCard = (p, h = 'h2') => `
      <article class="prog rv">
        <${h} class="prog__n"><a href="/program/${p.slug}">${esc(p.name)}</a></${h}>
        <p class="prog__d">${esc(p.description)}</p>
        <p class="prog__c">${epByProgram(p.slug).length} episode di portal ini</p>
      </article>`;

  await page('/program', doc(head({
    title: 'Program',
    description: 'Kasisolusi Podcast, Coach Kasisolusi, Talkjil, dan Kasimonolog. Empat program Kasisolusi untuk pemilik usaha.',
    path: '/program',
    jsonld: [breadcrumbLd(bc)],
  }), shell('/podcast', `
${phero({ bc, eyebrow: eyebrow('Program'), title: 'Program Kasisolusi', desc: 'Empat program Kasisolusi dengan format dan tempo yang berbeda.' })}
<section class="section">
  <div class="wrap grid grid--2">${programs.map((p) => progCard(p)).join('')}</div>
</section>`)));

  for (const p of programs) {
    const eps = epByProgram(p.slug);
    const path = `/program/${p.slug}`;
    const pbc = [...bc, { name: p.name, path }];
    const main = `
${phero({
      bc: pbc,
      eyebrow: eyebrow('Program Kasisolusi'),
      title: esc(p.name),
      desc: esc(p.description),
      extra: `<div class="meta" style="margin-top:var(--s-4)"><span>${eps.length} episode di portal</span><span>${esc(site.schedule)}</span></div>`,
      actions: platformRow(),
    })}
<section class="section--tight">
  <div class="wrap">
    ${eps.length
      ? `<div class="shead" style="margin-bottom:var(--s-4)"><h2 class="shead__t shead__t--sm">Episode</h2></div><div class="grid grid--3">${eps.map((e) => ecard(e)).join('')}</div>`
      : '<p class="empty">Episode program ini belum masuk ke portal. Tonton langsung di kanal YouTube Kasisolusi.</p>'}
  </div>
</section>
<section class="section bg-soft">
  <div class="wrap">
    <div class="shead"><h2 class="shead__t shead__t--sm">Program lain</h2></div>
    <div class="grid grid--3">${programs.filter((x) => x.slug !== p.slug).map((x) => progCard(x, 'h3')).join('')}</div>
  </div>
</section>`;

    await page(path, doc(head({ title: p.name, description: p.description, path, jsonld: [podcastSeriesLd(p), breadcrumbLd(pbc)] }), shell('/podcast', main)));
  }
}

/* ---------------------------------------------------------------- 8. Kelas (KBI) */
async function buildKelas() {
  // Susunan mengikuti tracker KBI 8 Okt 2026: tanpa hero, langsung 10 Schools,
  // lalu Program Terdekat KBI, lalu Produk Edukasi Kasisolusi.
  const bc = [{ name: 'Beranda', path: '/' }, { name: 'KBI', path: '/kelas' }];
  await page('/kelas', doc(head({
    title: 'Kasisolusi Business Institute (KBI)',
    description: `${kbiPage.schools.desc} Sepuluh school, program terdekat, dan produk edukasi Kasisolusi.`,
    path: '/kelas',
    jsonld: [breadcrumbLd(bc)],
  }), shell('/kelas', kbiMain(NOW))));

  // Detail kelas Investment (task 48-62): hanya isi poster resmi.
  const d = detailInvestment;
  const bcD = [...bc, { name: d.school, path: d.path }];
  await page(d.path, doc(head({
    title: `${d.title} - ${d.school}`,
    description: `${d.title}: ${d.sub}. ${d.jadwal.tanggal} di ${d.jadwal.lokasi}, ${d.jadwal.alamat}, dan online. Offline Pass ${d.paket[0].harga}, Online Pass ${d.paket[1].harga}.`,
    path: d.path,
    image: `/assets/kbi/poster-${d.poster}-1x1.webp`,
    jsonld: [breadcrumbLd(bcD)],
  }), shell('/kelas', detailMain(d, NOW, crumbs(bcD, { light: true })))));
}

/* ---------------------------------------------------------------- 9b. Wellness */
// Landing page D.V.N, berdiri sendiri mengikuti panduan klien (lihat src/wellness.mjs).
// Tidak lewat page(): halaman ini noindex dan sengaja tidak masuk sitemap.
async function buildWellness() {
  if (!WELLNESS_TAYANG) return; // disembunyikan sementara, lihat data/site.mjs
  // Diimpor hanya saat tayang: src/wellness.mjs (draf klien) dan public/assets/wellness/
  // (termasuk font berlisensi) sengaja tidak ikut repo publik.
  const { wellnessDoc } = await import('./src/wellness.mjs');
  await writeFile(join(DIST, 'wellness.html'), wellnessDoc(), 'utf8');
}

/* ---------------------------------------------------------------- 10. Tentang */
async function buildTentang() {
  const bc = [{ name: 'Beranda', path: '/' }, { name: 'Tentang Kami', path: '/tentang' }];
  const main = `
${phero({ bc, eyebrow: eyebrow('Tentang Kami'), title: esc(site.headline), desc: esc(site.tagline) })}
<section class="section--tight">
  <div class="wrap narrow prose">${site.about.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
</section>
<section class="section--tight">
  <div class="wrap">
    <div class="stats rv">
      <div class="stat"><b>${EPISODES.length}</b><span>Episode di portal</span></div>
      <div class="stat"><b>${programs.length}</b><span>Program</span></div>
      <div class="stat"><b>${kanalList.length}</b><span>Kanal liputan</span></div>
      <div class="stat"><b>20.00</b><span>Jam tayang WIB</span></div>
    </div>
  </div>
</section>
<section class="section bg-soft">
  <div class="wrap">
    <div class="shead"><div>${eyebrow('Topik utama')}<h2 class="shead__t">Yang dibahas di Kasisolusi</h2></div></div>
    <div class="grid grid--4">
      ${pillars.map((p) => `
      <article class="prog rv">
        <span class="kanal" style="--k:${p.accent}">${esc(p.short)}</span>
        <h3 class="prog__n">${esc(p.name)}</h3>
        <p class="prog__d">${esc(p.blurb)}</p>
      </article>`).join('')}
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap grid grid--2" style="gap:clamp(1.5rem,1rem + 3vw,3.5rem);align-items:start">
    <div>
      <div class="shead" style="margin-bottom:var(--s-4)"><h2 class="shead__t shead__t--sm">Kenapa menonton Kasisolusi</h2></div>
      ${reasons.map((r, i) => `
      <div class="reason rv"><span class="reason__n">0${i + 1}</span><div><h3 class="reason__t">${esc(r.title)}</h3><p class="reason__b">${esc(r.body)}</p></div></div>`).join('')}
    </div>
    <div>
      <div class="shead" style="margin-bottom:var(--s-4)"><h2 class="shead__t shead__t--sm">Ikuti Kasisolusi</h2></div>
      <div class="panel">
        <p class="panel__h">Kanal resmi</p>
        <ul class="panel__list">${site.social.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a><small>${esc(s.handle)}</small></li>`).join('')}</ul>
      </div>
      <div class="panel" style="margin-top:var(--s-4)">
        <p class="panel__h">Perusahaan</p>
        <p style="font-weight:700;padding-top:.6rem">${esc(site.legalName)}</p>
        <p style="font-size:.85rem;color:var(--ink-3);margin-top:.35rem">Situs resmi: <a href="https://home.kasisolusi.co.id/" target="_blank" rel="noopener" style="color:var(--blue);font-weight:700">home.kasisolusi.co.id</a></p>
      </div>
    </div>
  </div>
</section>`;

  await page('/tentang', doc(head({
    title: 'Tentang Kasisolusi',
    description: `${site.legalName} adalah perusahaan media digital dengan misi memperkuat perekonomian Indonesia dengan mengedukasi UMKM lewat podcast.`,
    path: '/tentang',
    jsonld: [orgLd(), breadcrumbLd(bc)],
  }), shell('/tentang', main)));
}

/* ---------------------------------------------------------------- 11. Cari & 404 */
async function buildCari() {
  const bc = [{ name: 'Beranda', path: '/' }, { name: 'Cari', path: '/cari' }];
  const main = `
${phero({
    bc,
    eyebrow: eyebrow('Cari'),
    title: 'Cari artikel dan episode',
    extra: `
    <form class="searchbox" role="search" action="/cari">
      <label class="sr" for="q">Kata kunci</label>
      ${icon('search')}
      <input id="q" name="q" type="search" autocomplete="off" data-search-input placeholder="Cari topik, judul, atau nama narasumber" aria-describedby="hasil-info">
    </form>
    <p id="hasil-info" class="search-count" role="status" aria-live="polite" data-search-count>Memuat data pencarian...</p>`,
  })}
<section class="section--tight">
  <div class="wrap narrow">
    <h2 class="sr">Hasil pencarian</h2>
    <div data-search-results></div>
    <noscript><p class="empty">Pencarian memerlukan JavaScript. Silakan buka <a href="/berita" style="color:var(--blue)">News</a> atau <a href="/podcast" style="color:var(--blue)">daftar episode</a>.</p></noscript>
  </div>
</section>`;

  await page('/cari', doc(head({
    title: 'Cari',
    description: 'Cari artikel dan episode Kasisolusi berdasarkan kata kunci, topik, atau nama narasumber.',
    path: '/cari',
    noindex: true,
  }), shell('/cari', main)));

  const m404 = `
${phero({
    eyebrow: eyebrow('Galat 404'),
    title: 'Halaman tidak ditemukan',
    desc: 'Tautannya mungkin sudah berubah atau halamannya sudah dipindahkan. Coba mulai dari beranda atau cari langsung.',
    actions: `<a class="btn btn--white" href="/">Kembali ke Beranda</a><a class="btn btn--outline" href="/cari">Cari Artikel ${icon('arrow')}</a>`,
  })}${NEWS.length ? `
<section class="section bg-soft">
  <div class="wrap">
    <div class="shead"><div>${eyebrow('News & Insights')}<h2 class="shead__t shead__t--sm">Berita terbaru</h2></div></div>
    <div class="grid grid--3">${NEWS.slice(0, 3).map((a) => ncard(a)).join('')}</div>
  </div>
</section>` : ''}`;

  await page('/404', doc(head({
    title: 'Halaman tidak ditemukan',
    description: 'Halaman yang kamu cari tidak ditemukan di portal Kasisolusi.',
    path: '/404',
    noindex: true,
  }), shell('', m404)));
}

/* ---------------------------------------------------------------- 12. Feeds */
async function buildFeeds() {
  const urls = written.filter((p) => !['/404', '/cari'].includes(p));
  await writeFile(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((p) => `  <url><loc>${abs(p)}</loc><changefreq>${p === '/' ? 'daily' : 'weekly'}</changefreq><priority>${p === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>`, 'utf8');

  await writeFile(join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /cari

Sitemap: ${abs('/sitemap.xml')}
`, 'utf8');

  // Pembanding lama dipertahankan (seri = -1) supaya urutan RSS untuk tanggal yang sama tidak berubah.
  const rssItems = [...SEMUA].sort((a, b) => (waktuTerbit(a) < waktuTerbit(b) ? 1 : -1)).slice(0, 20).map((a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${abs(`/berita/${a.slug}`)}</link>
      <guid isPermaLink="true">${abs(`/berita/${a.slug}`)}</guid>
      <description>${esc(a.dek)}</description>
      <category>${esc(kanalName(a.kanal))}</category>
      <pubDate>${new Date(a.dibuat || `${a.date}T09:00:00+07:00`).toUTCString()}</pubDate>
    </item>`).join('\n');

  await writeFile(join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${site.origin}</link>
    <atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml"/>
    <description>${esc(site.description)}</description>
    <language>id-ID</language>
    <lastBuildDate>${NOW.toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`, 'utf8');

  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const index = [
    ...NEWS.map((a) => ({
      t: a.title, u: `/berita/${a.slug}`, k: kanalName(a.kanal), c: kanalColor(a.kanal),
      g: a.img, d: tanggal(a.date), y: `${a.readMinutes} menit baca`,
      h: norm([a.title, a.dek, kanalName(a.kanal), a.takeaways.join(' '),
        a.body.map((b) => b.text).join(' ').slice(0, 900), 'berita artikel news'].join(' ')),
    })),
    ...ARTICLES.map((a) => ({
      t: a.title, u: `/berita/${a.slug}`, k: kanalName(a.kanal), c: kanalColor(a.kanal),
      v: a.episode.id, d: tanggal(a.date), y: `${a.readMinutes} menit baca`,
      h: norm([a.title, a.dek, kanalName(a.kanal), a.takeaways.join(' '), a.episode.title, a.episode.guest || '',
        a.body.map((b) => b.text).join(' ').slice(0, 900), 'rangkuman podcast artikel episode'].join(' ')),
    })),
    ...EPISODES.map((e) => ({
      t: e.title, u: `/podcast/${e.slug}`, k: kanalName(e.kanal), c: kanalColor(e.kanal),
      v: e.id, d: tanggal(e.date), y: durasiMenit(e.seconds),
      h: norm(`${e.title} ${e.guest || ''} ${kanalName(e.kanal)} ${programs.find((p) => p.slug === e.program).name} episode podcast`),
    })),
  ];
  await writeFile(join(DIST, 'search-index.json'), JSON.stringify(index), 'utf8');
}

/* ---------------------------------------------------------------- run */
async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  await buildHome();
  await buildBerita();
  await buildKanal();
  await buildArtikel();
  await buildPodcast();
  await buildEpisodes();
  await buildProgram();
  await buildKelas();
  await buildWellness();
  await buildTentang();
  await buildCari();

  await cp(join(ROOT, 'public'), DIST, { recursive: true });
  await cp(join(ROOT, 'src', 'styles.css'), join(DIST, 'styles.css'));
  await cp(join(ROOT, 'src', 'app.js'), join(DIST, 'app.js'));
  await buildFeeds();

  console.log(`OK  ${written.length} halaman`);
  console.log(`    ${NEWS.length} berita (${BERITA_OTOMATIS.length} otomatis), ${ARTICLES.length} artikel, ${EPISODES.length} episode, ${kanalList.length} kanal, ${programs.length} program, ${kbiPage.schools.items.length} school KBI`);
}

main().catch((e) => { console.error(e); process.exit(1); });
