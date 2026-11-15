// Penjaga tulisan. Aturan gaya dan fakta pemilik ditegakkan DI KODE, bukan hanya di prompt:
// model murah bisa membandel diam-diam. Artikel yang gagal diulang sekali dengan daftar
// masalahnya; gagal lagi = dilewati dan alasannya dicatat. Tidak ada artikel gagal yang terbit.
import { indeksSumber, angkaTakBersumber, kataBilanganTakBersumber } from './angka.mjs';
import { token, judulKembar } from './seleksi.mjs';
import { jumlahKata, satuBaris } from './alat.mjs';
import { PANJANG_KATA, JUDUL_MAKS } from './konfigurasi.mjs';
import { KANAL_SAH } from '../../src/berita-otomatis.mjs';

// ------------------------------------------------------------------ alat teks

/** Normalisasi untuk pencocokan: huruf kecil, tanpa aksen, kutip lurus, spasi tunggal. */
export function normal(s) {
  return satuBaris(String(s || ''))
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[—–―‒]/g, '-');
}

const kata = (s) => normal(s).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Pisahkan teks menjadi potongan di luar dan di dalam tanda kutip ganda.
 * @returns {Array<{kutipan:boolean, t:string}>}
 */
export function potongKutipan(teks) {
  const s = String(teks || '');
  const out = [];
  let buf = '';
  let dalam = false;
  let pembuka = '';
  for (const c of s) {
    const buka = c === '“' || (c === '"' && !dalam);
    const tutupnya = (c === '”' && dalam) || (c === '"' && dalam && pembuka === '"');
    if (!dalam && buka) {
      if (buf) out.push({ kutipan: false, t: buf });
      buf = c;
      dalam = true;
      pembuka = c;
    } else if (dalam && tutupnya) {
      out.push({ kutipan: true, t: buf + c });
      buf = '';
      dalam = false;
    } else buf += c;
  }
  if (buf) out.push({ kutipan: dalam, t: buf });
  return out;
}

const diLuarKutipan = (teks, fn) => potongKutipan(teks).map((p) => (p.kutipan ? p.t : fn(p.t))).join('');
const teksLuarKutipan = (teks) => potongKutipan(teks).filter((p) => !p.kutipan).map((p) => p.t).join(' ');
const kutipanDalam = (teks) => potongKutipan(teks).filter((p) => p.kutipan).map((p) => p.t.replace(/^["“]|["”]$/g, ''));

/** Semua teks artikel per bagian, untuk diperiksa. */
function bagianArtikel(a) {
  return [
    ['judul', a.title],
    ['dek', a.dek],
    ...(a.takeaways || []).map((t, i) => [`poin ${i + 1}`, t]),
    ...(a.body || []).map((b, i) => [`${b?.type === 'h2' ? 'subjudul' : b?.type === 'quote' ? 'kutipan' : 'paragraf'} ${i + 1}`, b?.text]),
  ].filter(([, t]) => typeof t === 'string');
}

// ------------------------------------------------------------------ perbaikan otomatis

function perbaikiTanda(s) {
  return String(s)
    .replace(/(\d)\s*[—–―‒]\s*(\d)/g, '$1-$2') // rentang angka: 2025–2026 -> 2025-2026
    .replace(/^\s*[—–―‒]\s*/, '')
    .replace(/\s*[—–―‒]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([,.;:?])/g, '$1');
}

const RE_PRABOWO = /(\b(?:Pak|Bapak)\s+)?\bPrabowo\b/g;
const SUDAH_PRESIDEN = /\bPresiden(?:\s+(?:RI|Republik Indonesia|terpilih|Ke-8|kedelapan))?\s+$/i;

/** "Prabowo" telanjang di luar kutipan menjadi "Presiden Prabowo". Kutipan langsung tidak disentuh. */
export function perbaikiPrabowo(teks) {
  return diLuarKutipan(teks, (s) => s.replace(RE_PRABOWO, (m, pak, offset, str) => {
    if (!pak && SUDAH_PRESIDEN.test(str.slice(Math.max(0, offset - 40), offset))) return m;
    return 'Presiden Prabowo';
  }));
}

function adaPrabowoTelanjang(teks) {
  return potongKutipan(teks).some((p) => !p.kutipan && [...p.t.matchAll(RE_PRABOWO)].some((m) => m[1] || !SUDAH_PRESIDEN.test(p.t.slice(Math.max(0, m.index - 40), m.index))));
}

/**
 * Perbaikan aman yang tidak mengubah makna: tanda pisah, gelar Presiden, spasi, tanda bintang
 * markdown. Mengembalikan salinan artikel dan catatan perbaikannya.
 */
export function perbaikiOtomatis(a) {
  const catatan = new Set();
  const benahi = (s) => {
    if (typeof s !== 'string') return s;
    let t = satuBaris(s.replace(/\*\*|__/g, ''));
    const t1 = perbaikiTanda(t);
    if (t1 !== t) catatan.add('tanda pisah diganti koma');
    const t2 = perbaikiPrabowo(t1);
    if (t2 !== t1) catatan.add('"Prabowo" menjadi "Presiden Prabowo"');
    return t2;
  };
  const b = { ...a };
  for (const k of ['title', 'dek', 'imgAlt', 'illustration']) b[k] = benahi(a[k]);
  if (typeof b.title === 'string') b.title = b.title.replace(/[.]+$/, '');
  b.takeaways = Array.isArray(a.takeaways) ? a.takeaways.map(benahi) : a.takeaways;
  b.body = Array.isArray(a.body) ? a.body.map((x) => (x && typeof x === 'object' ? { type: String(x.type || '').toLowerCase(), text: benahi(x.text) } : x)) : a.body;
  return { artikel: b, catatan: [...catatan] };
}

// ------------------------------------------------------------------ daftar kata

// Superlatif kuantitatif, daftar eksplisit (keputusan pemilik). Sengaja bukan pola ter\w+,
// supaya "terutama", "terbaru", "terkait" tidak ikut tertangkap.
const SUPERLATIF = /\bpaling\s+(?:sering|banyak|jarang|umum|tinggi|rendah|besar|kecil|utama|dominan|parah|kerap)\b|\b(?:tersering|terbanyak|terbesar|tertinggi|terendah|terkecil|terjarang|terparah)\b|\b(?:mayoritas|kebanyakan|sebagian besar|pada umumnya|rata-rata)\b/gi;
// Jumlah samar yang sering dikarang model ("ribuan UMKM"): juga wajib ada di sumber.
const JUMLAH_SAMAR = /\b(?:belasan|puluhan|ratusan|ribuan|puluhan ribu|ratusan ribu|jutaan|miliaran|triliunan)\b/gi;
// Kata tidak baku (keputusan pemilik: menunggu, memberi, bertanya, supaya, untuk, hanya).
const TIDAK_BAKU = /\b(?:nunggu|nungguin|dikasih|ngasih|nanya|nanyain|biar|buat|(?<!cuma-)cuma(?!-cuma)|bikin|gimana|gini|gitu|banget|nggak|ngga|enggak|gak|aja|udah|kalo|pengen|dapet|kayak|doang|nyari|ngomong|bareng)\b/gi;
const SENSASI = /\b(?:heboh|geger|gempar|menggemparkan|mengejutkan|melongo|tak disangka|tidak disangka|ngeri|sadis|tragis|mencekam|mengerikan|horor|merinding|kiamat)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const PENUTUP_BERITA = /pelaku usaha|umkm|usaha kecil|usaha mikro|bagi usaha|bagi penjual|bagi pedagang|apa artinya|langkah|yang perlu|yang bisa dilakukan|dampak/i;

// ------------------------------------------------------------------ salinan dari sumber

function untaiSalinan(teksKeluaran, teksSumber) {
  const N = 8;
  const src = kata(teksSumber);
  const set = new Set();
  for (let i = 0; i + N <= src.length; i++) set.add(src.slice(i, i + N).join(' '));
  const out = kata(teksKeluaran);
  let cocok = 0;
  let runTerpanjang = 0;
  let run = 0;
  const total = Math.max(0, out.length - N + 1);
  for (let i = 0; i < total; i++) {
    if (set.has(out.slice(i, i + N).join(' '))) {
      cocok++;
      run++;
      runTerpanjang = Math.max(runTerpanjang, run + N - 1);
    } else run = 0;
  }
  return { rasio: total ? cocok / total : 0, runTerpanjang };
}

const BATAS_SALINAN = { media: { rasio: 0.2, run: 25 }, lembaga: { rasio: 0.3, run: 35 }, youtube: { rasio: 0.35, run: 35 } };

// ------------------------------------------------------------------ pemeriksaan utama

/**
 * Periksa artikel hasil model. Mengembalikan daftar masalah (kosong = lolos).
 * @param {object} a artikel (sesudah perbaikiOtomatis)
 * @param {{jenis:'berita'|'tips', asal:string, bahan:string, judulSumber:string, judulTerbaru?:string[]}} k
 */
export function periksaArtikel(a, k) {
  const m = [];
  const jenis = k.jenis;
  const bahanNorm = normal(k.bahan);
  const idx = indeksSumber(k.bahan);

  // --- bentuk
  for (const f of ['title', 'dek', 'imgAlt', 'illustration']) if (typeof a[f] !== 'string' || !a[f].trim()) m.push(`kolom "${f}" kosong`);
  if (!KANAL_SAH.includes(a.kanal)) m.push(`kanal harus salah satu dari ${KANAL_SAH.join(', ')}`);
  if (!Array.isArray(a.takeaways) || a.takeaways.length !== 3) m.push('takeaways harus tepat 3 butir');
  else a.takeaways.forEach((t, i) => { if (typeof t !== 'string' || t.length < 20 || t.length > 220) m.push(`poin ${i + 1} harus 20-220 karakter`); });
  if (!Array.isArray(a.body) || a.body.length < 4) {
    m.push('body terlalu pendek (minimal 4 blok)');
    return m;
  }
  a.body.forEach((b, i) => {
    if (!b || !['p', 'h2', 'quote'].includes(b.type) || typeof b.text !== 'string' || !b.text.trim()) m.push(`blok body ${i + 1} tidak sah (type harus p, h2, atau quote)`);
  });
  if (m.length) return m;

  // --- panjang dan susunan
  const nKata = jumlahKata(a.body.filter((b) => b.type !== 'h2').map((b) => b.text).join(' '));
  const [minKata, maksKata] = PANJANG_KATA[jenis];
  if (nKata < minKata || nKata > maksKata) m.push(`isi ${nKata} kata; harus ${minKata}-${maksKata} kata`);
  if (a.body[0].type !== 'p') m.push('blok pertama body harus paragraf (type p)');
  const h2 = a.body.map((b, i) => [b, i]).filter(([b]) => b.type === 'h2');
  if (!h2.length) m.push('body harus punya subjudul (type h2)');
  if (jenis === 'berita') {
    const [akhir, i] = h2[h2.length - 1] || [];
    if (!akhir || !PENUTUP_BERITA.test(akhir.text)) m.push('subjudul terakhir harus bagian praktis untuk pelaku usaha, misalnya "Apa artinya bagi pelaku usaha"');
    else if (!a.body.slice(i + 1).some((b) => b.type === 'p')) m.push('bagian praktis di akhir harus berisi paragraf');
  }
  for (let i = 1; i < a.body.length; i++) if (a.body[i].type === 'h2' && a.body[i - 1].type === 'h2') m.push('dua subjudul berurutan tanpa paragraf');

  // --- judul
  const t = a.title;
  if (t.length < 25 || t.length > JUDUL_MAKS) m.push(`judul ${t.length} karakter; harus 25-${JUDUL_MAKS}`);
  if (/!/.test(t)) m.push('judul tidak boleh memakai tanda seru');
  if (/\.\.\.$|…$/.test(t)) m.push('judul tidak boleh berakhir dengan titik-titik');
  const huruf = t.replace(/[^\p{L}]/gu, '');
  if (huruf.length > 15 && huruf.replace(/[^\p{Lu}]/gu, '').length / huruf.length > 0.6) m.push('judul tidak boleh huruf kapital semua');
  if (SENSASI.test(t)) m.push(`judul memakai kata sensasional: "${t.match(SENSASI)[0]}"`);
  const inti = token(`${k.judulSumber} ${String(k.bahan).slice(0, 800)}`);
  const samaInti = [...token(t)].filter((w) => inti.has(w)).length;
  if (samaInti < 2) m.push('judul harus menyebut inti berita dari bahan (nama lembaga, program, atau pokok soalnya)');
  if (a.dek.length < 60 || a.dek.length > 250) m.push(`dek ${a.dek.length} karakter; harus 60-250`);
  if (a.imgAlt.length < 10 || a.imgAlt.length > 200) m.push('imgAlt harus 10-200 karakter');

  // --- tanda dan gaya, di semua bagian
  const semua = bagianArtikel(a);
  for (const [nama, teks] of semua) {
    if (/[—–―‒]/.test(teks)) m.push(`${nama}: ada tanda pisah panjang (—/–); pakai koma atau titik`);
    if (/[<>]/.test(teks)) m.push(`${nama}: tidak boleh ada tanda < atau >`);
    if (EMOJI.test(teks)) m.push(`${nama}: tidak boleh ada emoji`);
    if (/https?:\/\/|www\.|\]\(|^#{1,6}\s|```/.test(teks)) m.push(`${nama}: tanpa tautan dan markdown`);
    if (adaPrabowoTelanjang(teks)) m.push(`${nama}: tulis "Presiden Prabowo", bukan "Prabowo" saja`);
    const gaul = [...new Set((teksLuarKutipan(teks).match(TIDAK_BAKU) || []).map((x) => x.toLowerCase()))];
    if (gaul.length) m.push(`${nama}: kata tidak baku ${gaul.map((x) => `"${x}"`).join(', ')}; pakai kata baku (menunggu, memberi, bertanya, supaya, untuk, hanya, membuat)`);
  }

  // --- angka
  const angkaSalah = new Set();
  for (const [, teks] of semua) for (const x of angkaTakBersumber(teks, idx)) angkaSalah.add(x);
  if (angkaSalah.size) m.push(`angka tidak ada di bahan: ${[...angkaSalah].map((x) => `"${x}"`).join(', ')}. Hapus, atau pakai angka yang persis tertulis di bahan`);
  const kataBil = kataBilanganTakBersumber(`${a.title} ${a.dek}`, idx, k.bahan);
  if (kataBil.length) m.push(`bilangan di judul/dek tidak ada di bahan: ${kataBil.map((x) => `"${x}"`).join(', ')}`);

  // --- superlatif dan jumlah samar
  const cekDaftar = (re, label) => {
    const salah = new Set();
    for (const [, teks] of semua) for (const x of teks.match(re) || []) if (!bahanNorm.includes(normal(x))) salah.add(x.toLowerCase());
    if (salah.size) m.push(`${label} tidak ada di bahan: ${[...salah].map((x) => `"${x}"`).join(', ')}`);
  };
  cekDaftar(SUPERLATIF, 'kata peringkat/superlatif');
  cekDaftar(JUMLAH_SAMAR, 'jumlah samar');

  // --- kutipan harus persis dari bahan
  const bahanKata = ` ${kata(k.bahan).join(' ')} `;
  const adaDiBahan = (q) => bahanKata.includes(` ${kata(q).join(' ')} `);
  for (const b of a.body.filter((x) => x.type === 'quote')) {
    if (!adaDiBahan(b.text)) m.push(`kutipan tidak ditemukan persis di bahan: "${b.text.slice(0, 60)}..."; kutipan langsung tidak boleh dikarang`);
  }
  for (const [nama, teks] of semua) {
    for (const q of kutipanDalam(teks)) {
      if (kata(q).length >= 5 && !adaDiBahan(q)) m.push(`${nama}: kalimat dalam tanda kutip tidak ada persis di bahan: "${q.slice(0, 60)}"`);
    }
  }

  // --- tulis ulang, jangan menyalin
  const luar = a.body.filter((b) => b.type !== 'quote').map((b) => teksLuarKutipan(b.text)).join(' ');
  const salin = untaiSalinan(luar, k.bahan);
  const batas = BATAS_SALINAN[k.asal] || BATAS_SALINAN.media;
  if (salin.rasio > batas.rasio || salin.runTerpanjang >= batas.run) {
    m.push(`terlalu mirip kalimat bahan (${Math.round(salin.rasio * 100)}% untaian 8 kata sama, terpanjang ${salin.runTerpanjang} kata); tulis ulang dengan kata-kata sendiri`);
  }

  // --- duplikat
  const kembar = (k.judulTerbaru || []).find((j) => judulKembar(token(t), token(j)));
  if (kembar) m.push(`judul terlalu mirip artikel yang sudah terbit: "${kembar}"`);

  return [...new Set(m)];
}

/** Ringkasan pendek untuk catatan status/Telegram. */
export const intiMasalah = (masalah) => masalah.map((x) => x.split(':')[0].split(';')[0]).slice(0, 3).join('; ').slice(0, 200);

// ------------------------------------------------------------------ ilustrasi

// Subjek ilustrasi yang dilarang: orang/wajah, benda yang pada dasarnya bertulisan atau
// berangka (model mengabaikan "no text" kalau subjeknya memang bertulisan), uang, dan
// bangunan atau tempat terkenal.
const SUBJEK_TERLARANG = /\b(person|people|man|men|woman|women|child|children|kid|kids|boy|girl|face|faces|hand|hands|finger|worker|workers|farmer|seller|vendor|customer|crowd|family|portrait|minister|president|official|officer|police|text|word|words|letter|letters|sign|signs|signboard|banner|poster|billboard|label|labels|logo|logos|brand|document|documents|paper|papers|newspaper|magazine|book cover|certificate|receipt|invoice|form|chart|graph|screen|monitor|smartphone|phone|laptop screen|website|app|money|banknote|banknotes|cash|coin|coins|currency|rupiah|dollar|card|cards|flag|map|calendar|clock|calculator|qr|barcode|price tag|menu|whiteboard|blackboard|monas|landmark|mosque|temple|church|palace|statue)\b/i;

const CADANGAN_ILUSTRASI = {
  bisnis: 'a tidy small shop counter with woven baskets, potted plants and neatly stacked plain boxes',
  keuangan: 'a ceramic piggy bank beside a small potted plant and a closed plain notebook on a wooden table',
  marketing: 'a plain kraft paper shopping bag and a parcel box tied with twine on a bright counter',
  kreatif: 'a camera on a tripod beside soft studio lights in an empty creative studio',
  ekonomi: 'rows of colorful shipping containers at a quiet harbor at sunrise',
  gayahidup: 'a cup of tea, a rolled yoga mat and a leafy plant in soft morning light',
};

/** Frasa objek ilustrasi yang aman; kalau usulan model melanggar, pakai cadangan per kanal. */
export function amankanIlustrasi(frasa, kanal) {
  const f = satuBaris(String(frasa || '')).replace(/[^\x20-\x7E]/g, '').slice(0, 240);
  const n = f.split(/\s+/).filter(Boolean).length;
  if (n >= 3 && n <= 40 && !SUBJEK_TERLARANG.test(f)) return { frasa: f, diganti: false };
  return { frasa: CADANGAN_ILUSTRASI[kanal] || CADANGAN_ILUSTRASI.bisnis, diganti: true };
}
