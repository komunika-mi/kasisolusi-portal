// Prioritas 1: siaran pers dan berita resmi lembaga. Pola daftar dan jebakannya sebagian
// diwarisi dari The Signal (scripts/fetch-gov.mjs):
// - DJP: garis miring di ujung `asal` WAJIB (pola tidak menangkap garis miring pembuka), dan
//   "/index.php" dibuang karena artikel yang sama tersaji di dua alamat. Judul DJP pernah tidak
//   cocok dengan isinya, jadi isinya yang dibaca model, bukan judulnya saja.
// - ekon.go.id: di runner GitHub hanya terjangkau lewat curl -k (lihat jaringan.mjs).
// - Kemenperin: memblokir IP pusat data; dilewati di runner, hanya jalan dari koneksi Indonesia.
// - Kemendag: tombol berbagi memuat URL artikel di query string, jadi polanya hanya href langsung.
// - BI: <h1> berisi nama berkas ("sp_2825026"); judul dari og:title. Tanggal ada di tanda tangan
//   humas di akhir siaran pers.
//
// Diuji dari laptop 15 Nov 2026 (daftar terbaca, isi artikel terbaca, tanggal terbaca):
// DJP, ekon.go.id, BI, Kemendag, Kemenperin, BPJPH, DJKI, BPOM, PNM, Ekraf.
//
// 23 Nov 2026: situs DJP dan BPJPH pindah ke Next.js. Daftar DJP pindah ke /id/siaran-pers (alamat
// lama /id/siaran-pers-page HTTP 404; pola tautannya tetap). Daftar BPJPH tidak lagi berupa tautan
// <a>, jadi slug dibaca dari data JSON yang ikut tersaji di halaman (lihat entrinya). Artikel BPJPH
// kini di /read/<slug>; alamat lama /main/read/<slug> masih dilayani, kecuali artikel yang slug-nya
// ikut berubah saat pindah. Kunci lama (/main/read/) tidak sama dengan kunci baru, tetapi artikel
// yang sudah diproses tetap tersaring lewat kemiripan judul (judul sementara dari slug).
//
// SENGAJA TIDAK DIPASANG (sudah dicoba 15 Nov 2026):
//   ojk.go.id      dibalas "Request Rejected" (WAF) 245 byte. Proteksi bot tidak diakali.
//   smesco.go.id   tidak punya halaman daftar berita (/news 404); berita di beranda bertanggal
//                  April 2026 dan isinya kiriman ulang media ("Sumber: Warta Ekonomi").
//   umkm.go.id     isi artikel dimuat lewat API yang memakai token; halamannya hanya memuat
//                  judul dan cuplikan 160 karakter. Dipakai sebagai radar topik (lihat radarUmkm).
//   kemenkop.go.id tidak resolve; halal.go.id timeout; indonesia.go.id kerangka JavaScript.
import { ambil, izinRobots, laranganAIDiHalaman } from './jaringan.mjs';
import { ekstrakArtikel } from './ekstrak.mjs';
import { kunciUrl, polos, satuBaris } from './alat.mjs';
import { cariFotoUtama } from './foto-rilis.mjs';

export const LEMBAGA = [
  {
    id: 'djp', nama: 'Direktorat Jenderal Pajak', label: 'Direktorat Jenderal Pajak (pajak.go.id)', singkat: ['DJP', 'Direktorat Jenderal Pajak'],
    daftar: 'https://pajak.go.id/id/siaran-pers', asal: 'https://pajak.go.id/',
    pola: /href="\/(?:index\.php\/)?(id\/siaran-pers\/[^"?#]+)"/g,
  },
  {
    id: 'ekon', nama: 'Kementerian Koordinator Bidang Perekonomian', label: 'Kemenko Perekonomian (ekon.go.id)', singkat: ['Kemenko Perekonomian', 'Kementerian Koordinator Bidang Perekonomian'],
    daftar: 'https://ekon.go.id/publikasi/1/siaran-pers', asal: 'https://ekon.go.id',
    pola: /href="(\/publikasi\/detail\/\d+\/[^"]+)"/g, urutanJudul: ['title', 'h1', 'og'],
  },
  {
    id: 'bi', nama: 'Bank Indonesia', label: 'Bank Indonesia (bi.go.id)', singkat: ['Bank Indonesia', 'BI'],
    daftar: 'https://www.bi.go.id/id/publikasi/ruang-media/news-release/default.aspx', asal: 'https://www.bi.go.id',
    pola: /href="((?:\/id)?\/publikasi\/ruang-media\/news-release\/Pages\/sp_\d+\.aspx)"/g,
  },
  {
    id: 'kemendag', nama: 'Kementerian Perdagangan', label: 'Kementerian Perdagangan (kemendag.go.id)', singkat: ['Kemendag', 'Kementerian Perdagangan'],
    daftar: 'https://www.kemendag.go.id/berita/siaran-pers', asal: '',
    pola: /href="(https:\/\/www\.kemendag\.go\.id\/berita\/siaran-pers\/[a-z0-9-]+)"/g,
  },
  {
    id: 'kemenperin', nama: 'Kementerian Perindustrian', label: 'Kementerian Perindustrian (kemenperin.go.id)', singkat: ['Kemenperin', 'Kementerian Perindustrian'],
    daftar: 'https://kemenperin.go.id/siaran-pers', asal: 'https://kemenperin.go.id',
    pola: /href="(\/artikel\/\d+\/[^"]+)"/g, hanyaIpIndonesia: true,
  },
  {
    id: 'bpjph', nama: 'Badan Penyelenggara Jaminan Produk Halal', label: 'BPJPH (bpjph.halal.go.id)', singkat: ['BPJPH', 'Badan Penyelenggara Jaminan Produk Halal'],
    daftar: 'https://bpjph.halal.go.id/berita', asal: 'https://bpjph.halal.go.id/read/',
    // Daftar berita ada di muatan Next.js (self.__next_f) sebagai JSON ber-escape: delapan objek
    // terbaru, atributnya diawali "date". Ribuan objek artikel lain di halaman yang sama (daftar
    // terkait, urut id naik mulai 2023) atributnya diawali "title", jadi tidak ikut tertangkap.
    pola: /\\"attributes\\":\{\\"date\\":\\"[^"\\]+\\",\\"publishedAt\\":\\"[^"\\]+\\",\\"title\\":[\s\S]{0,2000}?\\"slug\\":\\"([a-z0-9-]+)\\"/g,
  },
  {
    id: 'djki', nama: 'Direktorat Jenderal Kekayaan Intelektual', label: 'DJKI Kementerian Hukum (dgip.go.id)', singkat: ['DJKI', 'Direktorat Jenderal Kekayaan Intelektual'],
    daftar: 'https://dgip.go.id/artikel/list-artikel-berita?kategori=liputan-humas', asal: '',
    pola: /href="(https:\/\/(?:www\.)?dgip\.go\.id\/artikel\/detail-artikel-berita\/[a-z0-9-]+\?kategori=liputan-humas)"/g,
  },
  {
    id: 'bpom', nama: 'Badan Pengawas Obat dan Makanan', label: 'BPOM (pom.go.id)', singkat: ['BPOM', 'Badan Pengawas Obat dan Makanan'],
    daftar: 'https://www.pom.go.id/siaran-pers', asal: 'https://www.pom.go.id',
    pola: /href="(\/siaran-pers\/[a-z0-9-]+)"/g, urutanJudul: ['h1', 'og', 'title'],
  },
  {
    id: 'pnm', nama: 'PT Permodalan Nasional Madani (PNM)', label: 'PNM (pnm.co.id)', singkat: ['PNM', 'Permodalan Nasional Madani'],
    daftar: 'https://www.pnm.co.id/berita', asal: '',
    pola: /href="(https:\/\/www\.pnm\.co\.id\/berita\/[a-z0-9-]+)"/g,
  },
  {
    id: 'ekraf', nama: 'Kementerian Ekonomi Kreatif/Badan Ekonomi Kreatif', label: 'Kementerian Ekraf (ekraf.go.id)', singkat: ['Kemenekraf', 'Kementerian Ekonomi Kreatif', 'Bekraf'],
    daftar: 'https://ekraf.go.id/news', asal: 'https://ekraf.go.id',
    pola: /href="(\/news\/[a-z0-9-]+)"/g,
  },
];

// Pengumuman lelang, seleksi, dan lowongan bukan berita (catatan The Signal).
const BUKAN_BERITA = /pengumuman (seleksi|pemenang|lelang|pengadaan|sayembara)|sayembara|rekrutmen|lowongan|cpns|tender|pengadaan/i;

/** Teks tautan terpanjang untuk href tertentu (judul sementara dari halaman daftar). */
function teksTautan(html, href) {
  const aman = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let terbaik = '';
  for (const m of html.matchAll(new RegExp(`<a\\b[^>]*href="[^"]*${aman}"[^>]*>([\\s\\S]*?)</a>`, 'gi'))) {
    const t = satuBaris(polos(m[1]));
    if (t.length > terbaik.length && t.length < 300) terbaik = t;
  }
  return terbaik;
}

const judulDariSlug = (u) => decodeURIComponent((new URL(u).pathname.split('/').filter(Boolean).pop() || '').replace(/\.aspx$/, '')).replace(/[-_]+/g, ' ');

/**
 * Kumpulkan tautan artikel terbaru dari semua lembaga (belum mengambil isi).
 * @returns {Promise<{kandidat: object[], laporan: object[]}>}
 */
export async function kumpulkanLembaga({ perSumber = 8 } = {}) {
  const diRunner = Boolean(process.env.GITHUB_ACTIONS);
  const laporan = [];
  const kandidat = [];
  await Promise.all(LEMBAGA.map(async (s) => {
    const lap = { id: s.id, nama: s.label, jenis: 'lembaga', status: 'ok', tautan: 0, catatan: '' };
    laporan.push(lap);
    if (diRunner && s.hanyaIpIndonesia) {
      lap.status = 'dilewati';
      lap.catatan = 'hanya terjangkau dari IP Indonesia (diblokir di runner GitHub)';
      return;
    }
    try {
      const izin = await izinRobots(s.daftar);
      if (!izin.boleh) throw new Error(izin.alasan);
      const r = await ambil(s.daftar, { timeout: 25000 });
      const ada = new Set();
      for (const m of r.teks.matchAll(s.pola)) {
        const u = m[1].startsWith('http') ? m[1] : s.asal + m[1];
        const kunci = kunciUrl(u);
        if (ada.has(kunci)) continue;
        ada.add(kunci);
        const judul = teksTautan(r.teks, m[1]) || judulDariSlug(u);
        if (BUKAN_BERITA.test(judul)) continue;
        kandidat.push({
          jenis: 'berita', asal: 'lembaga', sumber: s, sumberId: s.id, sumberNama: s.nama, sumberLabel: s.label,
          url: u, kunci, judul, ringkas: '', terbit: '', urutanDaftar: ada.size,
        });
        if (ada.size >= perSumber) break;
      }
      lap.tautan = ada.size;
      if (!ada.size) {
        lap.status = 'kosong';
        lap.catatan = 'pola tautan tidak menemukan artikel (struktur halaman berubah?)';
      }
    } catch (e) {
      lap.status = 'gagal';
      lap.catatan = String(e.message).slice(0, 120);
    }
  }));
  laporan.sort((a, b) => LEMBAGA.findIndex((x) => x.id === a.id) - LEMBAGA.findIndex((x) => x.id === b.id));
  return { kandidat, laporan };
}

/**
 * Ambil isi satu artikel lembaga atau media. Mengisi k.isi, k.terbit, k.judulHalaman.
 * @returns {Promise<{ok:boolean, alasan?:string, permanen?:boolean}>}
 */
export async function ambilIsi(k) {
  const izin = await izinRobots(k.url);
  if (!izin.boleh) return { ok: false, alasan: izin.alasan, permanen: true };
  let r;
  try {
    r = await ambil(k.url, { timeout: 25000, jeda: Math.max(800, izin.jedaMs) });
  } catch (e) {
    return { ok: false, alasan: `gagal ambil (${e.message})`, permanen: e.status === 404 || e.status === 410 };
  }
  const larangan = laranganAIDiHalaman(r.teks);
  if (larangan) return { ok: false, alasan: larangan, permanen: true };
  const namaSitus = k.sumber?.singkat || [k.sumberNama];
  const e = ekstrakArtikel(r.teks, { namaSitus: [...namaSitus, k.sumberNama], urutanJudul: k.sumber?.urutanJudul });
  k.isi = e.teks;
  k.terbit = e.terbit || k.terbit || '';
  if (e.judul) k.judul = e.judul;
  // Kiriman ulang berita media di situs lembaga ("Sumber: Warta Ekonomi") diperlakukan sebagai
  // media: hak ciptanya milik media itu.
  const kiriman = r.teks.match(/>\s*Sumber\s*:\s*([A-Z][\w .]{2,40})\s*</);
  if (k.asal === 'lembaga' && kiriman && !/humas|biro|kementerian|badan|direktorat|siaran pers/i.test(kiriman[1])) {
    return { ok: false, alasan: `isi kiriman ulang dari ${kiriman[1].trim()}`, permanen: true };
  }
  // Foto rilis (keputusan pemilik 16 Nov 2026): hanya untuk siaran pers lembaga. Foto media tidak
  // pernah diambil (hak cipta kantor berita); berita media dan tips tetap memakai ilustrasi AI.
  if (k.asal === 'lembaga') k.fotoUrl = cariFotoUtama(r.teks, { asal: r.url || k.url });
  return { ok: true };
}
