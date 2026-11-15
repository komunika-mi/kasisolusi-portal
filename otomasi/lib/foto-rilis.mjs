// Foto asli dari halaman siaran pers lembaga. Keputusan pemilik (16 Nov 2026): berita dari rilis
// memakai foto rilisnya, seperti The Signal; yang tidak berfoto (dan semua berita media serta
// tips) tetap memakai ilustrasi AI.
//
// Hak pakai: siaran pers pemerintah termasuk Pasal 43 huruf b UU 28/2014 (terbitan pemerintah boleh
// diumumkan ulang kecuali dinyatakan dilindungi); kreditnya "Dok. <lembaga>". Foto MEDIA tidak
// diambil sama sekali: sering milik kantor berita (AFP, Reuters, Antara Foto).
//
// cariFotoUtama() DIPINDAH UTUH dari The Signal (D:\projects\the-signal\scripts\lib.mjs, versi
// 3 Sep 2026) yang diukur atas 20 sumber pemerintah dan 381 foto arsip. Ringkasan aturannya:
//   0. og:image, hanya bila URL absolut, satu domain induk dengan halaman sumber, bukan host contoh
//      (picsum dan sejenisnya), dan bukan perabot halaman (Kemendag mengisinya dengan about.png).
//   1. gambar di jalur penyimpanan foto berita (JALUR_ISI); yang berada di antara paragraf isi dulu.
//   2. gambar yang namanya dekat dengan URL sumber (token slug atau nomor id).
//   Tidak ada tingkat "gambar pertama apa pun": di setiap kasus terukur itu selalu perabot (logo,
//   bendera, spanduk), dan perabot berkredit lebih buruk daripada ilustrasi.
// Jebakan dan buktinya ada di komentar asli di repo The Signal; jangan longgarkan aturan di sini
// tanpa mengukur ulang di sana.
import { createHash } from 'node:crypto';
import { ambil } from './jaringan.mjs';

const FOLDER_PERABOT = /\/(appasset|static|icons?|theme|template|layout)\/|\/_layouts\/|\/assets\/(imgs?|images)\/(part|theme|ui|bg)\/|\/img\/(ui|bg|icon)|\/assets\/img\/|\/assets\/frontend\/images\/|\/front_assets\//i;
const HOST_CONTOH = /(^|\.)(picsum\.photos|placehold\.(co|it)|placeholder\.com|dummyimage\.com|unsplash\.it|lorempixel\.com|placekitten\.com|loremflickr\.com)$/i;
const JALUR_ISI = /\/PublishingImages\/|\/albums?\/|\/download\/|\/imagecache\/|thumbs?\.tvonenews\.com|\/media-center\/|\/uploads?\/|\/storage\/|\/wp-content\/uploads\/|\/sites\/default\/files\/|\/image\/|\/berita_utama\/|\/dir-site\/uploads\/|\/blogs\//i;
// "whatsapp" SENGAJA tidak ada: WhatsApp-Image-...jpeg adalah nama baku foto rilis humas.
const NAMA_PERABOT = /^(logo|icon|favicon|avatar|banner|flag|bendera|blank|share|sprite|placeholder|spinner|bahasa|english|watermark|default|footer|header|sidebar|widget|tiktok|facebook|twitter|instagram|youtube|linkedin|telegram)[-_.]?/i;

function perabotHalaman(u) {
  if (FOLDER_PERABOT.test(u)) return true;
  const nama = (u.split('?')[0].split('/').pop() || '');
  if (NAMA_PERABOT.test(nama)) return true;
  if (/_(small|mini|thumb)\.|-(small|mini)\./i.test(nama)) return true;
  return false;
}

const KATA_UMUM = new Set(('indonesia jakarta pemerintah kementerian menteri nasional presiden '
  + 'republik berita artikel siaran detail storage upload uploads images image assets '
  + 'content default files public styles thumbnail conversions perusahaan keterangan '
  + 'tentang dengan untuk dalam pada yang dari hingga dorong ungkap tembus perkuat').split(' '));

/**
 * Foto utama halaman siaran pers, atau '' bila tidak ada yang layak.
 * @param {string} html
 * @param {{asal?: string}} opsi asal = URL halaman sumber (untuk alamat relatif dan domain induk)
 */
export function cariFotoUtama(html, opsi = {}) {
  const kandidat = [];
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const ogUrl = og ? og[1] : '';

  // Hanya di dalam tag <img> (bukan <script src>); data-src didahulukan untuk halaman lazy-load.
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const atribut = tag[0];
    const m = atribut.match(/\b(?:data-src|data-original|data-lazy-src|data-echo)=["']([^"'\s]+)["']/i)
      || atribut.match(/\bsrc=["']([^"'\s]+)["']/i);
    if (m) kandidat.push({ u: m[1], pos: tag.index });
  }

  // Rentang paragraf isi (<p> >= 60 huruf): pemutus seri, gambar di dalamnya didahulukan.
  const paragraf = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .filter((p) => p[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length >= 60);
  const isiAwal = paragraf.length ? paragraf[0].index : -1;
  const isiAkhir = paragraf.length ? paragraf[paragraf.length - 1].index + paragraf[paragraf.length - 1][0].length : -1;
  const diDalamIsi = (k) => isiAwal >= 0 && k.pos >= isiAwal && k.pos <= isiAkhir;

  const bukanBentukFoto = (u) => /^data:/i.test(u) || /\.svg(\?|$)/i.test(u);

  const bereskan = (u) => {
    if (!/^https?:\/\//i.test(u)) {
      if (!opsi.asal) return '';
      try { u = new URL(u, opsi.asal).href; } catch { return ''; }
    }
    // Drupal menyajikan turunan kecil di /styles/<gaya>/public/ (DJP 207x220); aslinya tanpa segmen itu.
    u = u.replace(/\/sites\/default\/files\/styles\/[^/]+\/public\//i, '/sites/default/files/');
    // Tambahan Kasisolusi 16 Nov 2026 (diuji langsung): BI menulis og:image dengan http:// yang
    // tidak menjawab dari sini, dan menunjuk turunan web SharePoint /PublishingImages/_w/<nama>_png.jpg
    // berukuran 320x213; berkas aslinya /PublishingImages/<nama>.png 1500x999, HTTP 200.
    u = u.replace(/^http:\/\//i, 'https://');
    u = u.replace(/\/PublishingImages\/_w\/([^/?]+)_(png|jpe?g)\.jpg(\?|$)/i, '/PublishingImages/$1.$2$3');
    return u.replace(/_\d{2,4}_\d{2,4}(\.(?:jpg|jpeg|webp))$/i, '_1200_675$1');
  };

  const hostDari = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
  const domainInduk = (h) => {
    const p = h.split('.');
    return (/\.(go|co|or|ac|sch|web|my)\.id$/.test(h) ? p.slice(-3) : p.slice(-2)).join('.');
  };

  let tokenSumber = [];
  let idSumber = [];
  try {
    const s = new URL(opsi.asal);
    const akhir = (s.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    tokenSumber = akhir.split(/[^a-z0-9]+/).filter((t) => t.length >= 6 && !KATA_UMUM.has(t) && !/^\d+$/.test(t));
    idSumber = ((s.pathname + s.search).match(/\d{3,}/g) || []);
  } catch { /* tanpa asal, kedekatan tidak bisa dihitung */ }
  const dekatDenganSumber = (u) => {
    let pq = '';
    try { const x = new URL(u); pq = (x.pathname + x.search).toLowerCase(); } catch { return false; }
    return tokenSumber.some((t) => pq.includes(t)) || idSumber.some((i) => pq.includes(i));
  };

  const lolosSaringan = (u) => u && !bukanBentukFoto(u) && !perabotHalaman(u);

  // Pengecualian sempit (tambahan Kasisolusi 16 Nov 2026): bucket penyimpanan awan MILIK lembaga
  // itu sendiri, dikenali dari nama bucket yang memuat label domainnya. Ekraf menaruh og:image di
  // storage.googleapis.com/ekraf-web-prd-bucket-01/...; diperiksa: foto kegiatan 1600x1064.
  // Bucket lain di host yang sama (milik siapa saja) tetap ditolak.
  const HOST_BUCKET = /^(storage\.googleapis\.com|s3\.amazonaws\.com|[a-z0-9.-]+\.s3[.-][a-z0-9.-]*amazonaws\.com|[a-z0-9-]+\.blob\.core\.windows\.net)$/i;
  const bucketMilikSumber = (u, h, hAsal) => {
    if (!HOST_BUCKET.test(h)) return false;
    const label = domainInduk(hAsal).split('.')[0].toLowerCase();
    let bucket = h.split('.')[0];
    if (/^(storage\.googleapis\.com|s3\.amazonaws\.com)$/i.test(h)) {
      try { bucket = new URL(u).pathname.split('/')[1] || ''; } catch { return false; }
    }
    return label.length >= 3 && bucket.toLowerCase().includes(label);
  };

  // TINGKAT 0: og:image, absolut dan satu domain induk dengan halaman sumber.
  if (/^(https?:)?\/\//i.test(ogUrl) && lolosSaringan(ogUrl)) {
    const u = bereskan(ogUrl.replace(/^\/\//, 'https://'));
    const h = hostDari(u);
    const hAsal = hostDari(opsi.asal || '');
    if (u && h && !HOST_CONTOH.test(h) && (!hAsal || domainInduk(h) === domainInduk(hAsal) || bucketMilikSumber(u, h, hAsal))) return u;
  }

  // Khusus tingkat badan: "logo" di mana pun dalam nama berkas, dan sufiks WordPress -NNNxNN.
  const perabotBadan = (u) => {
    const nama = (u.split('?')[0].split('/').pop() || '');
    return perabotHalaman(u) || /logo/i.test(nama) || /-\d{1,3}x\d{1,3}\.(?:png|jpe?g|webp|avif)$/i.test(nama);
  };
  const lolosBadan = (k) => k && k.u && !bukanBentukFoto(k.u) && !perabotBadan(k.u);
  const isiDulu = (xs) => [...xs.filter(diDalamIsi), ...xs.filter((k) => !diDalamIsi(k))];

  // TINGKAT 1: jalur penyimpanan foto berita.
  for (const k of isiDulu(kandidat.filter((x) => lolosBadan(x) && JALUR_ISI.test(x.u)))) {
    const u = bereskan(k.u);
    if (u && !HOST_CONTOH.test(hostDari(u))) return u;
  }
  // TINGKAT 2: nama gambar dekat dengan URL sumber.
  for (const k of isiDulu(kandidat.filter(lolosBadan))) {
    const u = bereskan(k.u);
    if (u && !HOST_CONTOH.test(hostDari(u)) && dekatDenganSumber(u)) return u;
  }
  return '';
}

// Gerbang unduhan. The Signal memakai lebar minimal 400 untuk kartu 680 px; sampul Kasisolusi
// 1280x720, jadi ambangnya dinaikkan supaya foto tidak pecah saat diperbesar. Foto tegak ditolak:
// dipotong ke 16:9 ia kehilangan sebagian besar isinya (sering kepala orang).
export const FOTO_MIN = { lebar: 800, tinggi: 450, rasio: 1.15 };

/**
 * Unduh dan periksa foto rilis. Mengembalikan { webp, sidik } atau melempar galat berisi alasannya
 * (pemanggil lalu turun ke ilustrasi AI).
 * @param {string} url
 * @param {{riwayat?: Record<string, object>, jadikanSampul: (buf: Buffer) => Promise<Buffer>}} o
 */
export async function unduhFotoRilis(url, { riwayat = {}, jadikanSampul }) {
  const r = await ambil(url, { biner: true, timeout: 30000, jeda: 0 });
  const buf = r.buffer || Buffer.alloc(0);
  if (buf.length < 3000) throw new Error(`berkas terlalu kecil (${buf.length} B)`);
  if (buf.length > 25 * 1024 * 1024) throw new Error('berkas lebih dari 25 MB');
  const sharp = (await import('sharp')).default;
  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new Error('bukan gambar yang bisa dibaca');
  }
  const lebar = meta.autoOrient?.width || meta.width;
  const tinggi = meta.autoOrient?.height || meta.height;
  if (!lebar || !tinggi) throw new Error('ukuran gambar tidak terbaca');
  if (lebar < FOTO_MIN.lebar || tinggi < FOTO_MIN.tinggi) throw new Error(`terlalu kecil (${lebar}x${tinggi})`);
  if (lebar / tinggi < FOTO_MIN.rasio) throw new Error(`foto tegak atau persegi (${lebar}x${tinggi})`);
  const sidik = createHash('sha256').update(buf).digest('hex');
  // Foto yang sudah pernah dipakai (gambar bawaan situs, atau foto arsip yang dipakai ulang humas)
  // tidak dipasang lagi: lebih baik ilustrasi daripada sampul kembar.
  if (riwayat[sidik]) throw new Error(`sudah dipakai artikel ${riwayat[sidik].slug || 'lain'}`);
  const webp = await jadikanSampul(buf);
  return { webp, sidik, lebar, tinggi };
}

/** Kredit foto rilis, misalnya "Dok. Kemendag". */
export const kreditFotoRilis = (k) => `Dok. ${(k.sumber?.singkat || [])[0] || k.sumberNama}`.slice(0, 100);
