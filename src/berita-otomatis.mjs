// Berita otomatis: satu berkas JSON per artikel di data/berita/ (dibuat otomasi/jalan.mjs).
// Dipakai dua pihak: build.mjs (situs, tanpa dependensi) dan pipeline otomasi (sebelum menulis
// berkas). Aturan bentuknya sengaja ketat dan sama di kedua tempat. Berkas yang cacat membuat
// build GAGAL, bukan dilewati diam-diam: deploy yang gagal membuat Vercel tetap menayangkan
// versi terakhir yang sehat, sedangkan berkas yang dilewati diam-diam tidak ketahuan siapa pun.
//
// Nama berkas: <date>-<slug>.json. Berkas berawalan "_" (misalnya _status.json, catatan
// kuota dan kunci sumber) bukan artikel dan tidak dibaca di sini.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { kanal as KANAL } from './ui.mjs';

export const KANAL_SAH = Object.keys(KANAL);
export const JENIS_SAH = ['berita', 'tips'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WIB = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;
const URL_SAH = /^https?:\/\/[^\s"'<>]+$/;
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
// Teks dari model bahasa tidak boleh membawa tanda kurung siku HTML. Selain mencegah HTML
// sisipan, ini juga menutup celah "</script>" di dalam JSON-LD halaman.
const ADA_TAG = /[<>]/;

export const jalurGambar = (slug) => `/assets/berita/${slug}.webp`;

const teks = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max && !ADA_TAG.test(v);

/**
 * Periksa bentuk satu artikel otomatis. Kembalikan daftar masalah (kosong = sah).
 * @param {object} a artikel
 * @param {{publicDir?: string}} [opsi] publicDir diisi supaya keberadaan berkas gambar ikut dicek
 */
export function periksaBentuk(a, { publicDir } = {}) {
  const m = [];
  if (!a || typeof a !== 'object' || Array.isArray(a)) return ['bukan objek'];
  if (typeof a.slug !== 'string' || !SLUG.test(a.slug) || a.slug.length > 80) m.push('slug tidak sah');
  if (!teks(a.title, 10, 140)) m.push('title tidak sah');
  if (!teks(a.dek, 20, 400)) m.push('dek tidak sah');
  if (!KANAL_SAH.includes(a.kanal)) m.push(`kanal tidak dikenal: ${a.kanal}`);
  if (typeof a.date !== 'string' || !TANGGAL.test(a.date)) m.push('date bukan YYYY-MM-DD');
  if (typeof a.dibuat !== 'string' || !ISO_WIB.test(a.dibuat)) m.push('dibuat bukan ISO +07:00');
  else if (a.date && a.dibuat.slice(0, 10) !== a.date) m.push('date tidak sama dengan tanggal dibuat');
  if (!JENIS_SAH.includes(a.jenis)) m.push(`jenis tidak dikenal: ${a.jenis}`);
  if (a.otomatis !== true) m.push('otomatis harus true');
  if (typeof a.kunci !== 'string' || !a.kunci.trim() || a.kunci.length > 400) m.push('kunci tidak sah');
  if (a.img !== jalurGambar(a.slug)) m.push(`img harus ${jalurGambar(a.slug)}`);
  else if (publicDir && !existsSync(join(publicDir, a.img))) m.push(`berkas gambar tidak ada: public${a.img}`);
  if (!teks(a.imgAlt, 5, 200)) m.push('imgAlt tidak sah');
  if (!teks(a.foto, 1, 100)) m.push('foto tidak sah');
  if (!Array.isArray(a.takeaways) || a.takeaways.length < 1 || a.takeaways.length > 6 || !a.takeaways.every((t) => teks(t, 5, 300))) {
    m.push('takeaways tidak sah');
  }
  if (!Array.isArray(a.body) || a.body.length < 3 || a.body.length > 60) m.push('body tidak sah');
  else {
    a.body.forEach((b, i) => {
      if (!b || !['p', 'h2', 'quote'].includes(b.type) || !teks(b.text, 1, 2500)) m.push(`body[${i}] tidak sah`);
    });
  }
  if (!Array.isArray(a.sumber) || a.sumber.length < 1 || a.sumber.length > 5) m.push('sumber tidak sah');
  else {
    a.sumber.forEach((s, i) => {
      if (!s || !teks(s.label, 1, 300) || typeof s.url !== 'string' || !URL_SAH.test(s.url)) m.push(`sumber[${i}] tidak sah`);
    });
  }
  if (a.video !== undefined) {
    if (!a.video || typeof a.video.id !== 'string' || !ID_YOUTUBE.test(a.video.id) || !teks(a.video.title, 1, 300)) m.push('video tidak sah');
  }
  // Tombol cta di build.mjs memasang href apa adanya; artikel otomatis tidak boleh membawanya.
  if (a.cta !== undefined) m.push('artikel otomatis tidak boleh punya cta');
  return m;
}

/**
 * Baca semua artikel otomatis di `dir`. Folder yang belum ada = nol artikel.
 * @returns {{ berita: object[], galat: string[] }}
 */
export function bacaBeritaOtomatis(dir, { publicDir } = {}) {
  const berita = [];
  const galat = [];
  if (!existsSync(dir)) return { berita, galat };
  const slugTerpakai = new Map();
  for (const nama of readdirSync(dir).sort()) {
    if (!nama.endsWith('.json') || nama.startsWith('_') || nama.startsWith('.')) continue;
    let a;
    try {
      a = JSON.parse(readFileSync(join(dir, nama), 'utf8'));
    } catch (e) {
      galat.push(`${nama}: JSON rusak (${e.message})`);
      continue;
    }
    const masalah = periksaBentuk(a, { publicDir });
    if (!masalah.length && nama !== `${a.date}-${a.slug}.json`) masalah.push(`nama berkas harus ${a.date}-${a.slug}.json`);
    if (!masalah.length && slugTerpakai.has(a.slug)) masalah.push(`slug sama dengan ${slugTerpakai.get(a.slug)}`);
    if (masalah.length) {
      galat.push(`${nama}: ${masalah.join('; ')}`);
      continue;
    }
    slugTerpakai.set(a.slug, nama);
    berita.push(a);
  }
  return { berita, galat };
}

/** Waktu terbit dalam milidetik: `dibuat` bila ada, kalau tidak awal hari `date` (WIB). */
export const waktuTerbit = (a) => Date.parse(a.dibuat || `${a.date}T00:00:00+07:00`) || 0;
