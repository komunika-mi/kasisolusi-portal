// Prioritas 2: RSS media nasional. Hanya butir berumur paling lama 3x24 jam (keputusan pemilik),
// selalu ditulis ulang dengan kata-kata sendiri, dan sumbernya disebut lengkap (nama media,
// judul asli, tautan).
//
// Robots.txt diperiksa per host. Penerbit yang menolak perayap AI dilewati otomatis. Hasil
// pemeriksaan 15 Nov 2026:
//   detikFinance, CNBC Indonesia, Liputan6  boleh (detik dan CNBC bahkan eksplisit Allow untuk Google-Extended)
//   Republika                              robots.txt menolak GPTBot, anthropic-ai, CCBot, PerplexityBot, dll.
//   ANTARA                                 robots.txt menolak ClaudeBot, dan kaki halamannya melarang
//                                          "crawling atau pengindeksan otomatis untuk AI" tanpa izin tertulis.
// Entri Republika dan ANTARA tetap terpasang: kalau kebijakannya berubah, kanalnya hidup sendiri.
//
// TIDAK DIPASANG: Google News RSS. robots.txt news.google.com menutup semua jalur kecuali beranda
// dan /topics/, /publications/, /stories/ untuk semua perayap; /rss/search termasuk yang ditutup.
// Sebagai gantinya, "radar" topik ramai dihitung dari tumpang-tindih judul antarsumber yang sudah
// kita ambil sendiri (lihat jalan.mjs) dan dari judul siaran pers umkm.go.id.
// Juga tidak dipasang: bisnis.com (403 proteksi bot, tidak diakali), RSS Tempo (basi).
import { ambil, izinRobots } from './jaringan.mjs';
import { kunciUrl, polos, satuBaris, umurJam } from './alat.mjs';
import { UMUR_MAKS_JAM } from './konfigurasi.mjs';

export const MEDIA = [
  { id: 'detik', nama: 'detikFinance', singkat: ['detikFinance', 'detikcom', 'detik'], rss: 'https://finance.detik.com/rss' },
  { id: 'cnbc', nama: 'CNBC Indonesia', singkat: ['CNBC Indonesia'], rss: 'https://www.cnbcindonesia.com/news/rss' },
  { id: 'cnbc-ent', nama: 'CNBC Indonesia', singkat: ['CNBC Indonesia'], rss: 'https://www.cnbcindonesia.com/entrepreneur/rss' },
  { id: 'liputan6', nama: 'Liputan6.com', singkat: ['Liputan6.com', 'Liputan6'], rss: 'https://feed.liputan6.com/rss/bisnis' },
  { id: 'republika', nama: 'Republika', singkat: ['Republika Online', 'Republika'], rss: 'https://www.republika.co.id/rss/ekonomi' },
  { id: 'antara', nama: 'ANTARA', singkat: ['ANTARA News', 'ANTARA'], rss: 'https://www.antaranews.com/rss/ekonomi.xml' },
];

const ambilTag = (blok, tag) => {
  const m = blok.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? satuBaris(polos(m[1])) : '';
};

export function uraiRss(xml) {
  return [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => {
    const b = m[0];
    const link = ambilTag(b, 'link') || (b.match(/<link[^>]+href="([^"]+)"/i) || [])[1] || ambilTag(b, 'guid');
    const tgl = ambilTag(b, 'pubDate') || ambilTag(b, 'dc:date') || ambilTag(b, 'published');
    return { judul: ambilTag(b, 'title'), url: link.trim(), terbit: Number.isNaN(Date.parse(tgl)) ? '' : new Date(tgl).toISOString(), ringkas: ambilTag(b, 'description') };
  }).filter((x) => x.judul && /^https?:\/\//.test(x.url));
}

/** @returns {Promise<{kandidat: object[], laporan: object[]}>} */
export async function kumpulkanMedia() {
  const laporan = [];
  const kandidat = [];
  await Promise.all(MEDIA.map(async (s) => {
    const lap = { id: s.id, nama: s.nama + (s.id === 'cnbc-ent' ? ' (Entrepreneur)' : ''), jenis: 'media', status: 'ok', tautan: 0, segar: 0, catatan: '' };
    laporan.push(lap);
    try {
      const izin = await izinRobots(s.rss);
      if (!izin.boleh) {
        lap.status = 'dilewati';
        lap.catatan = izin.alasan;
        return;
      }
      const r = await ambil(s.rss, { timeout: 25000 });
      const butir = uraiRss(r.teks);
      lap.tautan = butir.length;
      for (const x of butir) {
        if (umurJam(x.terbit) > UMUR_MAKS_JAM.media) continue;
        lap.segar++;
        kandidat.push({
          jenis: 'berita', asal: 'media', sumber: s, sumberId: s.id, sumberNama: s.nama, sumberLabel: s.nama,
          url: x.url, kunci: kunciUrl(x.url), judul: x.judul, ringkas: x.ringkas, terbit: x.terbit,
        });
      }
      if (!butir.length) {
        lap.status = 'kosong';
        lap.catatan = 'RSS tanpa butir';
      }
    } catch (e) {
      lap.status = 'gagal';
      lap.catatan = String(e.message).slice(0, 120);
    }
  }));
  laporan.sort((a, b) => MEDIA.findIndex((x) => x.id === a.id) - MEDIA.findIndex((x) => x.id === b.id));
  return { kandidat, laporan };
}

/**
 * Radar umkm.go.id: judul siaran pers dan berita Kementerian UMKM terbaru (7 hari, dari
 * sitemap). Isinya tidak bisa dibaca tanpa token API, jadi hanya judulnya yang dipakai untuk
 * menaikkan peringkat kandidat lain yang membahas topik yang sama.
 */
export async function radarUmkm({ maks = 4 } = {}) {
  const lap = { id: 'umkm', nama: 'umkm.go.id (radar judul)', jenis: 'radar', status: 'ok', tautan: 0, catatan: '' };
  const judul = [];
  try {
    const peta = 'https://umkm.go.id/sitemap.xml';
    const izin = await izinRobots(peta);
    if (!izin.boleh) throw new Error(izin.alasan);
    const r = await ambil(peta, { timeout: 20000 });
    const entri = [...r.teks.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
      .map((m) => ({ url: m[1].trim(), t: m[2].trim() }))
      .filter((x) => /^https:\/\/umkm\.go\.id\/(news|berita)\/[a-z0-9]+$/.test(x.url) && umurJam(x.t) <= 7 * 24)
      .sort((a, b) => (a.t < b.t ? 1 : -1))
      .slice(0, maks);
    lap.tautan = entri.length;
    for (const x of entri) {
      try {
        const h = await ambil(x.url, { timeout: 15000 });
        const og = h.teks.match(/<meta[^>]+property="og:title"[^>]*content="([^"]+)"/i);
        if (og) judul.push(satuBaris(polos(og[1])));
      } catch { /* satu halaman gagal tidak masalah */ }
    }
    if (!entri.length) lap.catatan = 'tidak ada berita 7 hari terakhir di sitemap';
  } catch (e) {
    lap.status = 'gagal';
    lap.catatan = String(e.message).slice(0, 120);
  }
  lap.judul = judul.length;
  return { judul, laporan: [lap] };
}
