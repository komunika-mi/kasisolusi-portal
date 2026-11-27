// Komponen dan helper tampilan.
import { site, socialBy } from '../data/site.mjs';
import { bantuan } from '../data/ekosistem.mjs';
import { esc } from './seo.mjs';

// ---------- kanal ----------
export const kanal = {
  bisnis: { name: 'Bisnis & UMKM', color: 'var(--k-bisnis)', blurb: 'Membangun, merapikan, dan menjalankan usaha sehari-hari.' },
  keuangan: { name: 'Keuangan', color: 'var(--k-keuangan)', blurb: 'Arus kas, modal, utang, dan cara usaha tetap sehat.' },
  marketing: { name: 'Marketing', color: 'var(--k-marketing)', blurb: 'Membangun merek dan mencari pembeli tanpa bakar uang.' },
  kreatif: { name: 'Industri Kreatif', color: 'var(--k-kreatif)', blurb: 'Konten, desain, dan produksi sebagai mesin pertumbuhan.' },
  ekonomi: { name: 'Ekonomi', color: 'var(--k-ekonomi)', blurb: 'Kebijakan dan kondisi ekonomi yang menyentuh usaha kecil.' },
  gayahidup: { name: 'Gaya Hidup', color: 'var(--k-gayahidup)', blurb: 'Kesehatan dan kebiasaan yang menopang produktivitas pemilik usaha.' },
};
export const kanalList = Object.entries(kanal).map(([slug, v]) => ({ slug, ...v }));
export const kanalName = (s) => kanal[s]?.name || 'Umum';
export const kanalColor = (s) => kanal[s]?.color || 'var(--blue)';

// ---------- format ----------
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function tanggal(iso) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "3 jam lalu" / "2 hari lalu" / tanggal penuh kalau sudah lama. */
export function lalu(iso, now = new Date()) {
  const s = Math.max(0, (now - new Date(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  const hari = Math.floor(s / 86400);
  if (hari < 30) return `${hari} hari lalu`;
  return tanggal(iso);
}

export function durasi(sec) {
  const j = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const d = sec % 60;
  return j > 0 ? `${j}:${String(m).padStart(2, '0')}:${String(d).padStart(2, '0')}` : `${m}:${String(d).padStart(2, '0')}`;
}
export const durasiMenit = (sec) => `${Math.round(sec / 60)} menit`;

export function tonton(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',').replace(',0', '')} rb`;
  return String(n);
}

// ---------- gambar YouTube ----------
export const thumbUrl = (id, q = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
// Frame asli dari dalam video (tanpa teks thumbnail). mqN 320x180, sdN 640x480
// berpalang hitam (terpotong rapi oleh object-fit: cover), maxresN 1280x720.
export const frameUrl = (id, n = 2, size = 'maxres') => `https://i.ytimg.com/vi/${id}/${size}${n}.jpg`;
export const frameSrcset = (id, n = 2) =>
  `${frameUrl(id, n, 'mq')} 320w, ${frameUrl(id, n, 'sd')} 640w, ${frameUrl(id, n, 'maxres')} 1280w`;

// Thumbnail resmi YouTube: mqdefault 320x180, sddefault 640x480 (berpalang, terpotong
// rapi oleh cover), maxresdefault 1280x720. Dipakai untuk kartu karena frame
// rekaman studio memuat timecode yang terbakar di videonya.
export const thumbImg = (id, { sizes = '(max-width:640px) 100vw, 400px', eager = false, alt = '' } = {}) =>
  `<img src="${thumbUrl(id, 'sddefault')}" srcset="${thumbUrl(id, 'mqdefault')} 320w, ${thumbUrl(id, 'sddefault')} 640w, ${thumbUrl(id, 'maxresdefault')} 1280w" sizes="${sizes}" width="640" height="360" alt="${esc(alt)}"` +
  ` loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async">`;

// Frame yang sudah dibersihkan dari timecode (tools/clean-frames.py), disajikan lokal.
export const heroSrc = (id, n, w = 1280) => `/assets/hero/${id}-${n}${w === 640 ? '-640' : ''}.jpg`;
export const heroImg = (id, n, { sizes = '100vw', eager = false, alt = '' } = {}) =>
  `<img src="${heroSrc(id, n)}" srcset="${heroSrc(id, n, 640)} 640w, ${heroSrc(id, n)} 1280w" sizes="${sizes}" width="1280" height="720" alt="${esc(alt)}"` +
  ` loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async">`;

export const frameImg = (id, { n = 2, sizes = '(max-width:640px) 100vw, 400px', eager = false, alt = '', pos } = {}) =>
  `<img src="${frameUrl(id, n, 'sd')}" srcset="${frameSrcset(id, n)}" sizes="${sizes}" width="640" height="360" alt="${esc(alt)}"` +
  ` loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async"${pos ? ` style="object-position:${pos}"` : ''}>`;

// ---------- ikon ----------
const stroke = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const I = {
  arrow: stroke('M5 12h14M13 6l6 6-6 6'),
  'arrow-left': stroke('M19 12H5M11 6l-6 6 6 6'),
  chev: stroke('m9 6 6 6-6 6'),
  play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z"/>',
  search: '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' + stroke('m20 20-3.5-3.5'),
  menu: stroke('M4 7h16M4 12h16M4 17h16'),
  close: stroke('M6 6l12 12M18 6L6 18'),
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>' + stroke('M12 11v5M12 8h.01'),
  external: stroke('M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'),
  youtube: '<path d="M23 12s0-3.8-.5-5.6a2.9 2.9 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.9 2.9 0 0 0-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6a2.9 2.9 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.9 2.9 0 0 0 2-2C23 15.8 23 12 23 12Zm-13.2 3.4V8.6l5.8 3.4Z" fill="currentColor"/>',
  spotify: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.8.8 0 0 1-1.1.3c-3-1.8-6.7-2.2-11.1-1.2a.8.8 0 1 1-.3-1.5c4.8-1.1 8.9-.6 12.2 1.4a.8.8 0 0 1 .3 1Zm1.2-2.8a1 1 0 0 1-1.3.3c-3.4-2.1-8.6-2.7-12.6-1.5a1 1 0 0 1-.6-1.9c4.6-1.4 10.3-.7 14.2 1.7a1 1 0 0 1 .3 1.4Zm.1-2.9C14.8 8.3 8.3 8.1 4.7 9.2a1.2 1.2 0 0 1-.7-2.3c4.2-1.3 11.3-1 15.7 1.6a1.2 1.2 0 1 1-1.2 2Z" fill="currentColor"/>',
  tiktok: '<path d="M16.6 5.8a4.8 4.8 0 0 1-1.1-3.1h-3.1v12.6a2.6 2.6 0 1 1-1.8-2.5V9.6a5.7 5.7 0 1 0 4.9 5.6V9.1a7.9 7.9 0 0 0 4.6 1.5V7.4a4.8 4.8 0 0 1-3.5-1.6Z" fill="currentColor"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.54h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21H9.5V9.75Z" fill="currentColor"/>',
  shorts: '<path d="M17.8 9.6 16.3 10.4l1.1.5c1.8.8 2.5 3 1.7 4.8-.4.8-1 1.4-1.8 1.8l-7.6 3.9c-1.8.9-4 .2-4.9-1.6-.9-1.8-.2-4 1.6-4.9l1.5-.8-1.1-.5C5 12.8 4.3 10.6 5.1 8.8c.4-.8 1-1.4 1.8-1.8l7.6-3.9c1.8-.9 4-.2 4.9 1.6.9 1.8.2 4-1.6 4.9ZM10 9.5v5.5l4.6-2.7Z" fill="currentColor"/>',
  wa: '<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a13.6 13.6 0 0 1-5.9-5c-.4-.6-1-1.5-1-2.9s.7-2 1-2.3c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4 0 .5l-.4.5c-.1.2-.3.3-.1.6a9 9 0 0 0 4 3.4c.3.2.5.1.6 0l.9-1c.2-.2.3-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.8-.1 1.4Z" fill="currentColor"/>',
  x: '<path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.7 21H1.5l7.5-8.6L1.1 3h6.6l4.5 5.6Zm-1.1 16h1.8L7.7 4.8H5.8Z" fill="currentColor"/>',
  link: stroke('M10 13a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 4.3l-1.7 1.7') + stroke('M14 11a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 19.7l1.7-1.7'),
  // ikon school KBI
  'k-branding': stroke('M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9Z'),
  'k-marketing': stroke('M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13'),
  'k-investment': stroke('M3 17l6-6 4 4 8-8M15 7h6v6'),
  'k-ai': stroke('M8 8h8v8H8zM10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3'),
  'k-finance': stroke('M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Zm0 0 12-3v3M17 13.5h.01'),
  'k-people': stroke('M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM21 19v-1a4 4 0 0 0-3-3.9M15.5 4.1a3 3 0 0 1 0 5.8'),
  'k-operation': '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>' + stroke('M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1'),
  'k-improvement': '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  'k-sales': stroke('M3 12l4-4 4 3 3-3 7 7M3 12v6h18v-3M7 8V4M17 11V4'),
  'k-executive': stroke('M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18'),
  // ikon kartu program dan detail kelas KBI
  kalender: stroke('M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM3 10h18M8 3v4M16 3v4'),
  lokasi: stroke('M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z') + '<circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  layar: stroke('M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 20h8M12 16v4'),
  mentor: stroke('M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1a4 4 0 0 0-2.5-3.7M15.5 4.3a3.5 3.5 0 0 1 0 6.4'),
  cek: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>' + stroke('m8 12.3 2.7 2.7L16 9.7'),
};
export const icon = (n, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${I[n] || ''}</svg>`;

// ---------- komponen ----------
export const kanalLabel = (k) => `<span class="kanal" style="--k:${kanalColor(k)}">${esc(kanalName(k))}</span>`;

/** Kartu berita: foto, label kanal, tanggal di foto, judul, dek, panah. */
export const ncard = (a, { eager = false } = {}) => `
  <article class="ncard rv">
    <span class="media">${a.img
      ? `<img src="${a.img}" width="1280" height="720" alt="" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async">`
      : thumbImg(a.episode.id, { eager })}</span>
    <div class="ncard__body">
      <div>
        <div class="ncard__top"><span class="pill">${esc(kanalName(a.kanal))}</span><time datetime="${a.date}">${tanggal(a.date)}</time></div>
        <h3 class="ncard__t"><a href="/berita/${a.slug}">${esc(a.title)}</a></h3>
        <p class="ncard__d">${esc(a.dek)}</p>
      </div>
      <span class="circle-arrow">${icon('arrow')}</span>
    </div>
  </article>`;

/** Kartu episode untuk grid indeks. */
export const ecard = (ep, { eager = false } = {}) => `
  <article class="ecard rv">
    <span class="media">${thumbImg(ep.id, { eager })}
      <span class="media__dur">${durasi(ep.seconds)}</span>
      <span class="media__play">${icon('play')}</span>
    </span>
    ${kanalLabel(ep.kanal)}
    <h3 class="ecard__t"><a href="/podcast/${ep.slug}">${esc(ep.title)}</a></h3>
    <div class="meta"><span>${tanggal(ep.date)}</span><span>${tonton(ep.views)} tayangan</span></div>
  </article>`;

/** Baris episode ringkas (daftar samping). */
export const eprow = (ep, { sub } = {}) => `
  <article class="eprow rv">
    <span class="media">${thumbImg(ep.id, { sizes: '150px' })}<span class="media__dur">${durasi(ep.seconds)}</span></span>
    <div>
      <h3 class="eprow__t"><a href="/podcast/${ep.slug}">${esc(ep.title)}</a></h3>
      <p class="eprow__s">${esc(sub ?? (ep.guest ? `Bersama ${ep.guest}` : kanalName(ep.kanal)))}</p>
    </div>
  </article>`;

export const rankItem = (item, i) => `
  <div class="rank__item">
    <span class="rank__n">${String(i + 1).padStart(2, '0')}</span>
    <div>
      <h3 class="rank__t"><a href="${item.href}">${esc(item.title)}</a></h3>
      <div class="meta"><span>${item.metaText}</span></div>
    </div>
  </div>`;

export const ext = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '');

// ---------- shell ----------
const logo = (extra = '') => `<img src="/assets/logo-white.png" width="478" height="90" alt="Kasisolusi"${extra}>`;

export function header(current = '') {
  const isCur = (p) => (p === '/' ? current === '/' : current === p || current.startsWith(`${p}/`));
  const link = (n) => `<a class="nav__link" href="${n.path}"${isCur(n.path) ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`;
  return `
<a class="skip" href="#main">Lompat ke isi utama</a>
<header class="hdr">
  <div class="wrap hdr__bar">
    <a class="brand" href="/" aria-label="Kasisolusi, ke beranda">${logo(' decoding="async"')}</a>
    <nav class="nav" aria-label="Navigasi utama">${site.nav.map(link).join('')}</nav>
    <div class="hdr__tools">
      <a class="iconbtn" href="/cari" aria-label="Cari artikel dan episode">${icon('search')}</a>
      <a class="btn btn--white btn--sm hdr__follow" href="/#ikuti">Ikuti Kami</a>
    </div>
  </div>
</header>`;
}

export function footer() {
  const soc = site.social
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${esc(s.name)} Kasisolusi">${icon(s.icon)}</a>`)
    .join('');
  const sub = (iconName, label, cta) => {
    const s = socialBy(iconName);
    return `<a class="ftr__sub" href="${s.url}" target="_blank" rel="noopener">${icon(iconName)}<b>${label}</b><em>${cta}</em><span class="go">${icon('arrow')}</span></a>`;
  };
  return `
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div>
        <a class="brand" href="/" aria-label="Kasisolusi, ke beranda">${logo(' loading="lazy" decoding="async"')}</a>
        <p class="ftr__slogan">${esc(site.slogan)}</p>
        <div class="ftr__soc">${soc}</div>
      </div>
      <div>
        <p class="ftr__h">Menu</p>
        <ul class="ftr__list">${site.nav.map((n) => `<li><a href="${n.path}">${esc(n.label)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <p class="ftr__h">Bantuan</p>
        <ul class="ftr__list">${bantuan.map((b) => `<li><a href="${b.url}"${ext(b.url)}>${esc(b.label)}</a></li>`).join('')}</ul>
      </div>
      <div class="ftr__upd">
        <p class="ftr__h">Dapatkan update terbaru</p>
        <p>Episode baru tayang tiap hari pukul 20.00 WIB. Ikuti kanal resmi supaya tidak ketinggalan.</p>
        <div class="ftr__subs">
          ${sub('youtube', 'YouTube', 'Subscribe')}
          ${sub('instagram', 'Instagram', 'Follow')}
          ${sub('tiktok', 'TikTok', 'Follow')}
        </div>
      </div>
    </div>
    <div class="ftr__base">
      <span>&copy; ${new Date().getFullYear()} ${esc(site.legalName)}. Seluruh hak cipta dilindungi.</span>
      <span>${esc(site.signoff)}</span>
    </div>
  </div>
</footer>`;
}
