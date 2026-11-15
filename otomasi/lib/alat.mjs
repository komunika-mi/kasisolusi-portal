// Alat kecil bersama: log, waktu WIB, teks, hash, slug.
import { createHash } from 'node:crypto';

export function log(...a) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
}

export const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Waktu "sekarang". BERITA_SEKARANG (ISO) bisa diisi untuk uji, misalnya
 * BERITA_SEKARANG=2026-11-16T07:30:00+07:00, supaya laju per jam bisa dicoba tanpa menunggu.
 */
export function sekarang() {
  const paksa = process.env.BERITA_SEKARANG;
  if (paksa) {
    const t = Date.parse(paksa);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return new Date();
}

/** Pecah waktu menjadi komponen WIB (UTC+7, tanpa musim panas). */
export function wib(d = sekarang()) {
  const w = new Date(d.getTime() + 7 * 3600e3);
  const p = (n) => String(n).padStart(2, '0');
  const tanggal = `${w.getUTCFullYear()}-${p(w.getUTCMonth() + 1)}-${p(w.getUTCDate())}`;
  return {
    tanggal,
    tahun: w.getUTCFullYear(),
    jam: w.getUTCHours(),
    menit: w.getUTCMinutes(),
    iso: `${tanggal}T${p(w.getUTCHours())}:${p(w.getUTCMinutes())}:${p(w.getUTCSeconds())}+07:00`,
  };
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/** "2026-11-16" atau Date -> "16 November 2026" (tanggal WIB). */
export function tanggalPanjang(x) {
  const t = typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? new Date(`${x}T12:00:00+07:00`) : new Date(x);
  if (Number.isNaN(t.getTime())) return '';
  const w = wib(t);
  return `${Number(w.tanggal.slice(8, 10))} ${BULAN[Number(w.tanggal.slice(5, 7)) - 1]} ${w.tahun}`;
}

export const umurJam = (iso, kini = sekarang()) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (kini.getTime() - t) / 3600e3;
};

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Sejenis slugify di build.mjs (ditambah pembuangan aksen) supaya slug berita otomatis seragam dengan yang lama. */
export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/["'’“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');
}

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', laquo: '"', raquo: '"', copy: '(c)' };
export function dekodeEntitas(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITAS[n.toLowerCase()] ?? m);
}

/** Buang tag HTML dan rapikan spasi. */
export function polos(html) {
  return dekodeEntitas(
    String(html ?? '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const satuBaris = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export const jumlahKata = (s) => (String(s ?? '').match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length;

/** Jalankan `kerja` atas `daftar` dengan paling banyak `n` sekaligus. */
export async function sejajar(daftar, n, kerja) {
  const hasil = new Array(daftar.length);
  let i = 0;
  const pekerja = Array.from({ length: Math.max(1, Math.min(n, daftar.length)) }, async () => {
    while (i < daftar.length) {
      const k = i++;
      hasil[k] = await kerja(daftar[k], k);
    }
  });
  await Promise.all(pekerja);
  return hasil;
}

/** Potong di batas kata. */
export function ringkas(s, maks) {
  const t = satuBaris(s);
  if (t.length <= maks) return t;
  const c = t.slice(0, maks - 1);
  const sp = c.lastIndexOf(' ');
  return `${(sp > maks * 0.6 ? c.slice(0, sp) : c).replace(/[.,;:\s]+$/, '')}...`;
}

/** Kunci sumber yang seragam: tanpa query/fragmen, tanpa garis miring di ujung, host huruf kecil. */
export function kunciUrl(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    x.search = '';
    x.hostname = x.hostname.toLowerCase().replace(/^www\./, '');
    // DJP menyajikan artikel yang sama dengan dan tanpa /index.php (catatan The Signal).
    x.pathname = x.pathname.replace(/^\/index\.php\//, '/').replace(/\/+$/, '');
    return `${x.protocol}//${x.hostname}${x.pathname}`;
  } catch {
    return String(u || '').trim();
  }
}
