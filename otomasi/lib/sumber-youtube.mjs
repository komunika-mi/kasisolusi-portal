// Tips dari podcast Kasisolusi sendiri (YouTube @kasisolusi). Bahan HANYA judul dan deskripsi
// resmi episode; transkrip tidak dipakai karena dari IP pusat data tidak bisa diambil dengan andal.
//
// Jalur yang dipakai, semuanya kanal Kasisolusi sendiri dan volumenya kecil:
// - RSS kanal (15 unggahan terbaru, deskripsi lengkap). Pemilik mencatat RSS jalan di runner GitHub.
// - RSS playlist "School" dan Coach (masing-masing 15 butir, deskripsi lengkap) untuk arsip
//   evergreen, karena unggahan baru hanya sekitar satu episode per hari sedangkan kuota tips 3.
// - Halaman watch untuk episode di data/episodes.mjs: cadangan terakhir. Dari laptop berisi
//   deskripsi; dari pusat data biasanya datang tanpa data, dan itu dibiarkan gagal (tidak diakali).
// Catatan: robots.txt YouTube menutup /feeds/videos.xml dan /results untuk perayap umum. RSS
// tetap dipakai karena ini kanal milik Kasisolusi sendiri dan pemilik memintanya; pencarian
// kanal (/@kasisolusi/search) tidak dipakai karena hanya memberi cuplikan ~180 karakter, terlalu
// tipis untuk jadi dasar artikel.
//
// Shorts dikenali dari tautan RSS-nya (https://www.youtube.com/shorts/<id>) dan deskripsinya
// kosong; siaran langsung dari judulnya. Keduanya dilewati.
import { ambil } from './jaringan.mjs';
import { dekodeEntitas, satuBaris, umurJam, sekarang, wib } from './alat.mjs';
import { BAHAN_MIN, UMUR_MAKS_JAM } from './konfigurasi.mjs';
import { topikTipsDihindari } from './seleksi.mjs';

export const KANAL_YT = 'UC5rEjJFYx03lhODA9uH9zew';
// Playlist dari https://www.youtube.com/@kasisolusi/playlists (dicek 15 Nov 2026).
export const PLAYLIST_TIPS = [
  { id: 'PLsjA6QD1GbAnO8s87mVvD9U2UCGPtVzfG', nama: 'Kasisolusi Sales School' },
  { id: 'PLsjA6QD1GbAlmHl7PtkiFlKp9184gyz-1', nama: 'Kasisolusi Finance School' },
  { id: 'PLsjA6QD1GbAn5haPjnB0V-jHYgY3wFFyG', nama: 'Kasisolusi Branding School' },
  { id: 'PLsjA6QD1GbAnzBVfHR972Gx6bF9QHg7-Y', nama: 'Kasisolusi Marketing School' },
  { id: 'PLsjA6QD1GbAm5WC6IQttpXVgeSUylfDKe', nama: '#CoachKasisolusi' },
  { id: 'PLES5hCvlxgKc', nama: 'Titik Arah' },
];

const LIVE = /\b(live|livestream|live streaming|siaran langsung)\b|\[live\]/i;

export function uraiFeedYoutube(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const e = m[1];
    const ambilT = (re) => (e.match(re) || [])[1] || '';
    return {
      id: ambilT(/<yt:videoId>([^<]+)<\/yt:videoId>/),
      judul: satuBaris(dekodeEntitas(ambilT(/<title>([\s\S]*?)<\/title>/))),
      tautan: ambilT(/<link rel="alternate" href="([^"]+)"/),
      terbit: ambilT(/<published>([^<]+)<\/published>/),
      deskripsi: dekodeEntitas(ambilT(/<media:description>([\s\S]*?)<\/media:description>/)),
      tayangan: Number(ambilT(/<media:statistics views="(\d+)"/)) || 0,
    };
  }).filter((x) => /^[A-Za-z0-9_-]{11}$/.test(x.id) && x.judul);
}

/**
 * Bagian deskripsi yang berisi materi episode: sebelum garis pemisah pertama (-----), tanpa
 * ajakan subscribe, promosi, kontak, tagar, dan tautan.
 */
export function materiEpisode(deskripsi) {
  const baris = String(deskripsi || '').replace(/\r/g, '').split('\n');
  const keluar = [];
  for (const b of baris) {
    if (/^\s*[-_=–—]{5,}\s*$/.test(b)) break;
    const t = b.trim();
    if (/^simak (selengkapnya|pembahasannya)|^jangan lupa (subscribe|like)|^#|^https?:\/\/|^(instagram|tiktok|whatsapp|wa|email|gmail|lynk\.id|contact)\b/i.test(t)) continue;
    keluar.push(t.replace(/https?:\/\/\S+/g, '').trim());
  }
  return keluar.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Nama narasumber dari baris "🗣️: Nama" di awal deskripsi. */
export function narasumberDari(materi) {
  const m = String(materi).match(/^\s*🗣️?\s*:?\s*(.+)$/mu) || String(materi).match(/^\s*(?:bersama|narasumber)\s*:?\s*(.+)$/im);
  return m ? satuBaris(m[1]).replace(/^:\s*/, '').slice(0, 160) : '';
}

/** Episode yang materinya terikat tahun yang sudah lewat ("Krisis Ekonomi 2025") dilewati. */
function terikatTahunLewat(teks) {
  const tahunIni = wib().tahun;
  return [...String(teks).matchAll(/\b(20\d{2})\b/g)].some((m) => Number(m[1]) < tahunIni);
}

function nilaiEpisode(e, asalLabel, episodeLokal) {
  const materi = materiEpisode(e.deskripsi);
  const lokal = episodeLokal.get(e.id);
  const k = {
    jenis: 'tips', asal: 'youtube', sumberId: 'youtube', sumberNama: 'Podcast Kasisolusi', sumberLabel: asalLabel,
    url: `https://www.youtube.com/watch?v=${e.id}`, kunci: `yt:${e.id}`, judul: e.judul, ringkas: '',
    terbit: e.terbit, isi: materi, narasumber: narasumberDari(materi) || lokal?.guest || '', tayangan: e.tayangan,
    video: { id: e.id, title: e.judul.replace(/[—–]/g, '-') },
    baru: umurJam(e.terbit) <= UMUR_MAKS_JAM.episodeBaru,
  };
  if (/\/shorts\//.test(e.tautan) || /#shorts/i.test(e.judul)) return { k, alasan: 'Shorts' };
  if (LIVE.test(e.judul)) return { k, alasan: 'siaran langsung' };
  if (Date.parse(e.terbit) > sekarang().getTime()) return { k, alasan: 'belum tayang' };
  if (materi.length < BAHAN_MIN.tips) return { k, alasan: `deskripsi terlalu tipis (${materi.length} karakter)` };
  const topik = topikTipsDihindari(`${e.judul}\n${materi}`);
  if (topik) return { k, alasan: topik };
  if (!k.baru && terikatTahunLewat(`${e.judul}\n${materi}`)) return { k, alasan: 'materi terikat tahun yang sudah lewat' };
  return { k, alasan: '' };
}

/**
 * Kandidat tips dari RSS kanal dan playlist.
 * @param {{episodeLokal: Map<string, object>}} o data/episodes.mjs per id (untuk nama narasumber)
 */
export async function kumpulkanTips({ episodeLokal = new Map() } = {}) {
  const laporan = [];
  const kandidat = [];
  const ditolak = [];
  const sudah = new Set();
  const feeds = [
    { id: 'yt-kanal', nama: 'YouTube @kasisolusi (RSS kanal)', url: `https://www.youtube.com/feeds/videos.xml?channel_id=${KANAL_YT}` },
    ...PLAYLIST_TIPS.map((p) => ({ id: `yt-${p.id.slice(-6)}`, nama: `YouTube playlist ${p.nama}`, url: `https://www.youtube.com/feeds/videos.xml?playlist_id=${p.id}` })),
  ];
  const hasil = await Promise.all(feeds.map(async (f) => {
    const lap = { id: f.id, nama: f.nama, jenis: 'youtube', status: 'ok', tautan: 0, layak: 0, catatan: '' };
    try {
      const r = await ambil(f.url, { timeout: 20000, jeda: 300 });
      const entri = uraiFeedYoutube(r.teks);
      lap.tautan = entri.length;
      if (!entri.length) { lap.status = 'kosong'; lap.catatan = 'feed tanpa entri'; }
      return { f, lap, entri };
    } catch (e) {
      lap.status = 'gagal';
      lap.catatan = String(e.message).slice(0, 120);
      return { f, lap, entri: [] };
    }
  }));
  for (const { f, lap, entri } of hasil) {
    laporan.push(lap);
    for (const e of entri) {
      if (sudah.has(e.id)) continue;
      sudah.add(e.id);
      const { k, alasan } = nilaiEpisode(e, f.nama, episodeLokal);
      if (alasan) ditolak.push({ judul: e.judul, alasan, kunci: k.kunci });
      else { kandidat.push(k); lap.layak++; }
    }
  }
  return { kandidat, laporan, ditolak, sudah };
}

/**
 * Cadangan: deskripsi dari halaman watch untuk episode di data/episodes.mjs. Gagal dengan diam
 * (mengembalikan null) bila halaman datang tanpa data, seperti yang lazim dari pusat data.
 */
export async function episodeDariWatch(ep) {
  try {
    const r = await ambil(`https://www.youtube.com/watch?v=${ep.id}&hl=id&gl=ID`, { timeout: 20000, jeda: 1500 });
    const m = r.teks.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (!m) return null;
    const deskripsi = JSON.parse(`"${m[1]}"`);
    const live = /"isLiveContent":true/.test(r.teks);
    const tgl = (r.teks.match(/"(?:uploadDate|publishDate)":"([^"]+)"/) || [])[1] || ep.date;
    const e = { id: ep.id, judul: ep.title, tautan: `https://www.youtube.com/watch?v=${ep.id}`, terbit: new Date(tgl).toISOString(), deskripsi, tayangan: ep.views || 0 };
    if (live) e.judul = `[LIVE] ${e.judul}`;
    return nilaiEpisode(e, 'YouTube (halaman episode)', new Map([[ep.id, ep]]));
  } catch {
    return null;
  }
}
