// Ambil judul, tanggal terbit, dan teks bersih dari halaman artikel (lembaga maupun media).
// Teks utama memakai Readability (Mozilla) di atas linkedom; cadangannya gugus paragraf <p>
// terpanjang. Diuji 15 Nov 2026 pada contoh DJP, ekon.go.id, BI, Kemendag, Kemenperin, BPJPH,
// DJKI, BPOM, PNM, SMESCO, Ekraf, detikFinance, CNBC Indonesia, Liputan6, dan Republika.
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { polos, satuBaris, dekodeEntitas, sekarang } from './alat.mjs';

const BULAN = {
  januari: 1, jan: 1, februari: 2, pebruari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, may: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, aug: 8, september: 9, sept: 9, sep: 9,
  oktober: 10, okt: 10, oct: 10, november: 11, nopember: 11, nov: 11, desember: 12, des: 12, dec: 12,
};
const NAMA_BULAN = Object.keys(BULAN).sort((a, b) => b.length - a.length).join('|');
const RE_TGL_TEKS = new RegExp(`\\b(\\d{1,2})\\s+(${NAMA_BULAN})\\.?,?\\s+(\\d{4})\\b`, 'i');
const RE_TGL_ANGKA = /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/;

const p2 = (n) => String(n).padStart(2, '0');
function isoWib(y, m, d, jam = '12:00:00') {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
  return `${y}-${p2(m)}-${p2(d)}T${jam}+07:00`;
}

/** Nilai tanggal dari meta/JSON-LD. Tanpa zona waktu dianggap WIB. */
function uraiTanggalMeta(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    const zona = m[7] ? (m[7] === 'Z' ? 'Z' : m[7].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')) : '+07:00';
    const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}${zona}`);
    return Number.isNaN(t) ? '' : new Date(t).toISOString();
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(isoWib(m[1], +m[2], +m[3])).toISOString();
  return '';
}

export function tanggalDariTeks(s) {
  const t = String(s || '');
  let m = t.match(RE_TGL_TEKS);
  if (m) {
    const iso = isoWib(m[3], BULAN[m[2].toLowerCase()], Number(m[1]));
    if (iso) return new Date(iso).toISOString();
  }
  m = t.match(RE_TGL_ANGKA);
  if (m) {
    const iso = isoWib(m[3], Number(m[2]), Number(m[1]));
    if (iso) return new Date(iso).toISOString();
  }
  return '';
}

function masukAkal(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const kini = sekarang().getTime();
  return t <= kini + 36 * 3600e3 && t >= kini - 400 * 86400e3;
}

function metaIsi(html, nama) {
  const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${nama}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${nama}["']`, 'i');
  return (html.match(re1) || html.match(re2) || [])[1] || '';
}

/**
 * Tanggal terbit (ISO UTC) atau '' kalau tidak bisa dipastikan.
 * Urutan: meta/JSON-LD, baris "Kota, 14 November 2026" di isi (dateline di awal, atau tanda
 * tangan humas di akhir seperti siaran pers BI), tanggal di dekat judul (lencana tanggal
 * Kemenperin, SMESCO), dekat h1, lalu <time>.
 */
export function tanggalTerbit(html, teksMentah = '', judul = '') {
  const calon = [];
  for (const n of ['article:published_time', 'og:published_time', 'datePublished', 'publishdate', 'pubdate', 'dtk:publishdate', 'date', 'dc.date', 'DC.date.issued']) {
    const v = uraiTanggalMeta(metaIsi(html, n));
    if (v) calon.push(v);
  }
  const ld = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
  if (ld) calon.push(uraiTanggalMeta(ld[1]) || tanggalDariTeks(ld[1]));
  const reBaris = new RegExp(`(?:^|\\n)[ \\t]*[\\p{L}][\\p{L} .()'/-]{1,40},\\s*(?:\\p{L}+,\\s*)?(\\d{1,2}\\s+(?:${NAMA_BULAN})\\.?\\s+\\d{4})`, 'giu');
  for (const m of String(teksMentah).matchAll(reBaris)) calon.push(tanggalDariTeks(m[1]));
  const sekitar = (i) => (i >= 0 ? tanggalDariTeks(polos(html.slice(Math.max(0, i - 1500), i + 2500))) : '');
  if (judul.length >= 15) {
    const potong = judul.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const badan = html.search(/<body[\s>]/i);
    const re = new RegExp(potong, 'g');
    re.lastIndex = Math.max(0, badan);
    const m = re.exec(html);
    if (m) calon.push(sekitar(m.index));
  }
  for (const m of html.matchAll(/<h1[\s>]/gi)) calon.push(tanggalDariTeks(polos(html.slice(m.index, m.index + 5000))));
  calon.push(tanggalDariTeks(String(teksMentah).slice(0, 400)));
  const t = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (t) calon.push(uraiTanggalMeta(t[1]));
  return calon.find((c) => c && masukAkal(c)) || '';
}

// ------------------------------------------------------------------ judul

function bersihkanJudul(s, namaSitus = []) {
  let t = satuBaris(dekodeEntitas(polos(s))).replace(/^[“"'‘]+|[”"'’]+$/g, '').trim();
  const bagian = t.split(/\s*\|\s*|\s+[–—-]\s+/);
  if (bagian.length > 1) {
    // Buang potongan yang isinya HANYA nama situs ("- BPJPH", "| Kementerian Perdagangan
    // Republik Indonesia"), bukan potongan yang kebetulan menyebut nama itu ("BPJPH dan Pemkab ...").
    const hanyaNama = (b) => {
      let x = b.toLowerCase();
      for (const n of namaSitus) if (n) x = x.split(n.toLowerCase()).join(' ');
      return x.replace(/republik indonesia|\bri\b|kementerian|[^a-z0-9]+/g, '').length < 4;
    };
    const sisa = bagian.filter((b) => !hanyaNama(b) && !/^(siaran pers|berita|news|liputan humas|kemenekraf\/bekraf ri)$/i.test(b));
    if (sisa.length) t = sisa.sort((a, b) => b.length - a.length)[0];
  }
  // "Kemenperin: Judul" -> "Judul"
  t = t.replace(/^([A-Z][A-Za-z]{2,15}):\s+/, (m, k) => (namaSitus.some((n) => n && n.toLowerCase().includes(k.toLowerCase())) ? '' : m));
  return t.trim();
}

function judulGenerik(t, namaSitus) {
  if (!t || t.length < 15 || /^sp_\d+$/i.test(t)) return true;
  if (/^(siaran pers|berita|news|liputan humas)(\s*\|.*)?$/i.test(t)) return true;
  // Judul yang isinya hanya nama situs ("Kementerian Koordinator Bidang Perekonomian Republik Indonesia").
  let sisa = t.toLowerCase();
  for (const n of namaSitus) if (n) sisa = sisa.replace(n.toLowerCase(), ' ');
  return sisa.replace(/republik indonesia|\bri\b|[^a-z0-9]+/g, '').length < 12;
}

export function judulHalaman(html, { namaSitus = [], urutan = ['og', 'h1', 'title'] } = {}) {
  const og = metaIsi(html, 'og:title');
  const tt = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1]).sort((a, b) => polos(b).length - polos(a).length);
  const sumber = { og: [og], title: [tt], h1 };
  for (const kunci of urutan) {
    for (const mentah of sumber[kunci] || []) {
      const t = bersihkanJudul(mentah, namaSitus);
      if (!judulGenerik(t, namaSitus)) return t;
    }
  }
  return '';
}

// ------------------------------------------------------------------ isi

const SAMPAH = [
  /^(bagikan|share|dokumentasi|baca juga|simak juga|lihat juga|tonton juga|advertisement|iklan|scroll to continue|gulir untuk|selesai|tentang)\b.{0,80}$/i,
  /^-{1,3}\s*selesai\s*-{1,3}$/i,
  /^\(?[a-z]{2,4}\/[a-z]{2,4}\)?$/i, // (acd/acd)
  /^\[gambas[^\]]*\]$/i,
  /^(sumber|editor|pewarta|penulis|reporter|foto|fotografer)\s*:/i,
  /^(copyright|©|hak cipta|\(c\))/i,
  /^demikian siaran pers/i,
  /^(siaran pers|press releases?|home|beranda|berita|news|liputan humas)$/i,
  /^\[\]$/,
  /^(apakah halaman ini bermanfaat|apakah anda ingin memberikan|apa pendapat anda)/i,
  /^terima kasih!?$/i,
  /^(diperbarui|dilihat \d+ kali)\b/i,
];
const KONTAK = /\b(website|e-?mail|telp|telepon|faks|fax|instagram|twitter|facebook|linkedin|whatsapp|tiktok|youtube|call center|contact|hubungi|kunjungi)\b|\bjl\.\s|\bjalan\s+[A-Z]|@\w+|www\.|https?:\/\//i;
// Langkah panduan bernomor ("1) Login pada laman https://merek.dgip.go.id/") adalah isi, bukan
// baris kontak, walau memuat alamat situs dan tidak diakhiri titik. Tanpa pengecualian ini langkah
// pertama panduan merek DJKI hilang dari bahan (23 Nov 2026).
// Butir daftar dari cadangan paragraf ("• ...", lihat isiDariParagraf) juga isi: kanal "Portal
// Bersama melalui www.bpjs.go.id" di laman BPJS Ketenagakerjaan bukan baris kontak.
const LANGKAH = /^(\(?\d{1,2}[).]|[a-h][).]|•)\s*\S/;

/** Buang baris navigasi, kontak, dan tautan terkait di ujung teks. */
export function rapikan(teks) {
  let baris = String(teks || '')
    .split(/\n+/)
    .map((b) => satuBaris(b))
    .filter(Boolean)
    .filter((b) => !SAMPAH.some((re) => re.test(b)))
    .filter((b) => LANGKAH.test(b) || !(b.length < 220 && KONTAK.test(b) && !/[.!?]["”]?$/.test(b.replace(/www\.[^\s]+|https?:\/\/\S+/g, ''))))
    .filter((b) => !(b.length < 220 && KONTAK.test(b) && (b.match(/\b(website|e-?mail|instagram|twitter|facebook|linkedin|whatsapp|telp)\b/gi) || []).length >= 2));
  // Ujung teks sering berisi daftar judul artikel lain (BI) atau tanda tangan humas.
  while (baris.length > 3) {
    const b = baris[baris.length - 1];
    if (b.length < 170 && !/[.!?]["”']?\)?$/.test(b)) baris.pop();
    else break;
  }
  // Kepala siaran pers: "SIARAN PERS", nomor surat, nama kementerian dalam huruf kapital.
  while (baris.length > 3) {
    const b = baris[0];
    if (b.length < 120 && (b === b.toUpperCase() || /^(no\.|nomor)\s/i.test(b))) baris.shift();
    else break;
  }
  return baris.join('\n');
}

/**
 * Cadangan Readability: gugus paragraf <p> terpanjang.
 * Gugus dibentuk dan dinilai HANYA dari paragraf "kuat" (>= 60 huruf, bertanda baca), seperti
 * semula. Yang ditambahkan (23 Nov 2026): butir daftar <li> (berawalan "• ") dan paragraf pendek
 * yang letaknya DI ANTARA paragraf kuat gugus terpilih, dan jarak antarparagraf kuat dihitung
 * tanpa blok-blok itu, jadi daftar panjang di tengah artikel tidak memutus gugus. Tanpa ini kanal
 * pendaftaran pemberi kerja dan daftar dokumennya di laman BPJS Ketenagakerjaan hilang dari bahan
 * (isinya di jendela modal, Readability memilih menu). Blok sebelum paragraf kuat pertama dan
 * sesudah yang terakhir tetap tidak diambil (menu, daftar tautan terkait).
 * Butir dan paragraf pendek yang lebih dari separuh teksnya tautan dianggap navigasi: tidak
 * diambil dan tidak ikut menjembatani. Tanpa ini deretan tautan kaki laman DJKI (porsi tautan 0,68)
 * menyambungkan isi laman dengan baris hak cipta di paling bawah; daftar BPJS Ketenagakerjaan
 * tidak memuat tautan sama sekali.
 */
export function isiDariParagraf(html) {
  const bersih = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  const navigasi = (mentah, t) =>
    [...mentah.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].reduce((s, x) => s + satuBaris(polos(x[1])).length, 0) > t.length / 2;
  const blok = [];
  const rentangP = [];
  for (const m of bersih.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    rentangP.push([m.index, m.index + m[0].length]);
    const t = satuBaris(polos(m[1]));
    if (!t) continue;
    const kuat = t.length >= 60 && /[.,]/.test(t);
    if (kuat || !navigasi(m[1], t)) blok.push({ i: m.index, akhir: m.index + m[0].length, t, kuat });
  }
  // Teks butir sendiri saja: sampai butir atau daftar berikutnya (daftar bersarang tidak ikut
  // tergabung), tanpa <p> di dalamnya (sudah terbaca sebagai paragraf).
  // Butir yang letaknya DI DALAM rentang <p> dilewati: teksnya sudah ikut paragraf itu. Laman
  // DJKI membuka <p> di remah roti tanpa menutupnya, sehingga satu "paragraf" menelan menu samping
  // dan seluruh isi; tanpa pengecualian ini butir menu tercetak dua kali (23 Nov 2026). Paragraf
  // raksasa itu sendiri sengaja dibiarkan: menutup <p> di tag blok berikutnya (cara peramban)
  // justru membuang tabel tarif dan jawaban FAQ DJKI dari bahan.
  const batas = /<\/?(?:li|ul|ol)\b/gi;
  let k = 0;
  for (const m of bersih.matchAll(/<li\b[^>]*>/gi)) {
    while (k < rentangP.length && rentangP[k][1] <= m.index) k++;
    if (k < rentangP.length && rentangP[k][0] < m.index) continue;
    const awal = m.index + m[0].length;
    batas.lastIndex = awal;
    const j = batas.exec(bersih);
    const akhir = j ? j.index : bersih.length;
    const mentah = bersih.slice(awal, akhir).replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, ' ');
    const t = satuBaris(polos(mentah));
    if (t && !navigasi(mentah, t)) blok.push({ i: m.index, akhir, t: `• ${t}`, kuat: false });
  }
  blok.sort((a, b) => a.i - b.i);
  const gugus = [];
  let lemah = 0; // panjang mentah blok non-kuat sejak paragraf kuat terakhir
  for (const b of blok) {
    const g = gugus[gugus.length - 1];
    if (!b.kuat) {
      if (g && b.i >= g.akhir) lemah += b.akhir - b.i;
      continue;
    }
    if (g && b.i - g.akhir - lemah < 3000) {
      g.kuat.push(b);
      g.akhir = b.akhir;
      g.panjang += b.t.length;
    } else gugus.push({ kuat: [b], awal: b.i, akhir: b.akhir, panjang: b.t.length });
    lemah = 0;
  }
  const terbaik = gugus.sort((a, b) => b.panjang - a.panjang)[0];
  if (!terbaik) return '';
  // Paragraf kuat yang berulang dibuang (seperti semula). Butir daftar dan paragraf pendek hanya
  // dibuang kalau sama dengan baris tepat sebelumnya: daftar di bagian lain boleh memuat butir yang
  // sama ("Kantor Cabang BPJS Ketenagakerjaan" untuk Penerima Upah dan Bukan Penerima Upah).
  const sudah = new Set();
  const isi = [];
  for (const b of blok) {
    if (b.i < terbaik.awal || b.akhir > terbaik.akhir) continue;
    if (b.kuat ? sudah.has(b.t) : isi[isi.length - 1] === b.t) continue;
    if (b.kuat) sudah.add(b.t);
    isi.push(b.t);
  }
  return isi.join('\n');
}

/**
 * Ekstrak satu halaman artikel.
 * @returns {{judul: string, terbit: string, teks: string}}
 */
export function ekstrakArtikel(html, { namaSitus = [], urutanJudul } = {}) {
  let mentahR = '';
  let judulR = '';
  try {
    const { document } = parseHTML(html);
    const hasil = new Readability(document, { charThreshold: 300 }).parse();
    if (hasil) {
      mentahR = polos(hasil.content);
      judulR = hasil.title || '';
    }
  } catch {
    // Readability bisa gagal pada HTML rusak; cadangan paragraf di bawah tetap jalan.
  }
  const teksR = rapikan(mentahR);
  const mentahP = isiDariParagraf(html);
  const teksP = rapikan(mentahP);
  const pakaiR = teksR.length >= 600 && teksR.length >= teksP.length * 0.5 ? true : !(teksP.length > teksR.length);
  const teks = pakaiR ? teksR : teksP;
  const judul = judulHalaman(html, { namaSitus, urutan: urutanJudul }) || bersihkanJudul(judulR, namaSitus);
  // Tanggal dicari di teks SEBELUM dirapikan: baris tanda tangan humas ("Jakarta, 14 November
  // 2026") justru ikut terbuang oleh perapian.
  return { judul, terbit: tanggalTerbit(html, pakaiR ? mentahR : mentahP, judul), teks };
}
