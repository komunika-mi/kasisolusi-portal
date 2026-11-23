// Bahan evergreen A (keputusan pemilik 23 Nov 2026): laman panduan dan informasi layanan resmi
// pemerintah untuk pelaku usaha, misalnya cara mengurus NIB, syarat KUR, sertifikasi halal
// gratis, pendaftaran merek, dan pajak UMKM. Bahan evergreen B (episode podcast arsip) diambil
// dari sumber-youtube.mjs; pengaturan gilirannya di jalan.mjs.
//
// Dua jalur:
// - PANDUAN: daftar kurasi, dipilih tangan dan diperiksa satu per satu (isi terbaca, robots.txt
//   mengizinkan, tidak ada larangan AI di halaman, isinya masih berlaku). Laman kurasi tidak
//   disaring kata kunci UMKM lagi; tanggal halamannya tetap diperiksa (konfigurasi
//   UMUR_MAKS_HARI_PANDUAN).
// - DAFTAR_PANDUAN: halaman daftar artikel edukasi resmi. Tautan baru dari sini disaring seperti
//   berita (relevansi UMKM, topik yang dihindari, kembar) sebelum ditulis, dan WAJIB bertanggal:
//   ekstraksi hanya membaca tanggal 400 hari terakhir, jadi laman lama (misalnya artikel KUR
//   2016 di Sikapi Uangmu) tampak tak bertanggal. Saat ini kosong: Sikapi Uangmu menolak IP
//   runner (HTTP 403), dan daftar artikel DJP hilang saat pajak.go.id berganti struktur (lihat
//   catatan di atas PANDUAN).
//
// Satu laman hanya menjadi satu artikel: kuncinya alamat laman (sama seperti berita), dan semua
// artikel otomatis yang sudah terbit tetap tercatat lewat data/berita. Kalau daftar ini habis,
// evergreen berhenti sendiri (kurang dari 3 per hari tidak apa-apa) sampai daftarnya ditambah.
import { ambil, izinRobots } from './jaringan.mjs';
import { kunciUrl, polos, satuBaris } from './alat.mjs';

/** Lembaga pemilik laman panduan. `singkat` juga dipakai ekstraksi untuk membuang nama situs dari judul. */
export const LEMBAGA_PANDUAN = {
  bpjph: { nama: 'Badan Penyelenggara Jaminan Produk Halal', label: 'BPJPH (bpjph.halal.go.id)', singkat: ['BPJPH', 'Badan Penyelenggara Jaminan Produk Halal'] },
  djki: { nama: 'Direktorat Jenderal Kekayaan Intelektual', label: 'DJKI Kementerian Hukum (dgip.go.id)', singkat: ['DJKI', 'Direktorat Jenderal Kekayaan Intelektual', 'Kementerian Hukum R.I.'] },
  djp: { nama: 'Direktorat Jenderal Pajak', label: 'Direktorat Jenderal Pajak (pajak.go.id)', singkat: ['DJP', 'Direktorat Jenderal Pajak'] },
  bi: { nama: 'Bank Indonesia', label: 'Bank Indonesia (bi.go.id)', singkat: ['Bank Indonesia', 'BI'] },
  bpjstk: { nama: 'BPJS Ketenagakerjaan', label: 'BPJS Ketenagakerjaan (bpjsketenagakerjaan.go.id)', singkat: ['BPJS Ketenagakerjaan', 'BPJSTK'] },
  djbc: { nama: 'Direktorat Jenderal Bea dan Cukai', label: 'Direktorat Jenderal Bea dan Cukai (beacukai.go.id)', singkat: ['Bea Cukai', 'DJBC', 'Direktorat Jenderal Bea dan Cukai'] },
  lpdb: { nama: 'LPDB Koperasi', label: 'LPDB Koperasi (lpdb.go.id)', singkat: ['LPDB', 'LPDB Koperasi', 'Lembaga Pengelola Dana Bergulir'] },
};

/**
 * @typedef {{lembaga:string, url:string, judul:string, diperiksa:string, catatan?:string}} Panduan
 * lembaga  = kunci LEMBAGA_PANDUAN.
 * judul    = judul kurasi. Menggantikan judul halaman (DJKI selalu "Kementerian Hukum R.I.", LPDB
 *            "LPDB Koperasi", OJK huruf kapital semua), dipakai di kredit sumber dan pembanding
 *            judul kembar. Judul kurasi harus saling berbeda: uji di otomasi/uji/lain.test.mjs
 *            menolak pasangan yang dianggap kembar oleh seleksi.judulKembar.
 * diperiksa = tanggal laman diperiksa tangan: ambilIsi lolos (robots.txt, larangan AI, ekstraksi,
 *            kiriman ulang), isinya panduan untuk pelaku usaha, bukan pendapat pribadi atau berita,
 *            dan tidak memakai aturan yang sudah diganti.
 */

/**
 * Daftar kurasi, diperiksa 23 Nov 2026 dari laptop dan lewat uji kering runner GitHub (urutan di
 * dalam lembaga = prioritas).
 * Sengaja TIDAK dimasukkan (hasil periksa hari itu):
 * - BPJPH "Kriteria pelaku UMK ... sertifikat halal gratis Program SEHATI 2026": sempat masuk dan
 *   terbit 23 Nov, lalu artikelnya diturunkan hari itu juga, karena kuota 1,35 juta SEHATI 2026
 *   sudah habis 15 Oktober 2026 (Databoks, data BPJPH). Laman program tahunan, kuota, atau
 *   periode pendaftaran baru boleh masuk sesudah status programnya dicek masih berjalan.
 * - 28 artikel di pajak.go.id/id/artikel: semuanya berpenafian "pendapat pribadi penulis dan bukan
 *   cerminan sikap instansi". Sejak 23 Nov siang alamat itu HTTP 404: pajak.go.id berganti
 *   struktur, dan laman lama pajak.go.id/id/pengusaha-kena-pajak ikut hilang. Penggantinya panduan
 *   resmi "Wajib Pajak Orang Pribadi Usaha" (/id/wajib-pajak/pribadi/usaha/..., terbit 20 Nov
 *   2026, tanpa penafian). Dari panduan itu sengaja tidak dimasukkan: kode-billing dan
 *   gambaran-umum-pembayaran (bahan tipis), gambaran-umum-pendaftaran (tumpang tindih dengan
 *   wajib-pajak-baru), spt-masa-pph (pemotongan PPh Unifikasi, jarang dipakai usaha mikro).
 * - 4 laman OJK Sikapi Uangmu (Article/40955 SLIK, 74 kredit usaha, 40950 restrukturisasi, 40961
 *   gadai): terbaca dari laptop, tetapi uji kering runner GitHub 23 Nov menjawab HTTP 403 untuk
 *   semuanya (IP pusat data ditolak). Proteksi tidak diakali.
 * - DJKI desain-industri/biaya (dasar tarifnya tidak tertulis), BPJSTK penerima-upah dan
 *   bukan-penerima-upah (memuat keringanan iuran berbatas waktu), BPJSTK artikel izin edar pangan
 *   (bukan wewenang BPJSTK), OJK Article/40768 (2022), Bea Cukai fta (jumlah perjanjian per 2023),
 *   larangan-pembatasan (masih UU 11/2020), barangkiriman (tarif PPN rawan berubah), pengajuan-nppbkc
 *   (salah ketik "PP 72 Tahun 2028", barang kena cukai), LPDB sektor-riil dan simpan-pinjam (isinya
 *   sudah ada di alur-proses), ahu.go.id/perseroan-terbatas (masih "Menteri Hukum dan HAM", isinya
 *   untuk notaris), dua laman BPJPH berbentuk berita (2024 dan 2025), pip.kemenkeu.go.id (DNS gagal).
 * @type {Panduan[]}
 */
export const PANDUAN = [
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/merek/syarat-prosedur', judul: 'Dokumen dan Langkah Mendaftarkan Merek', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/merek/biaya', judul: 'Biaya Pendaftaran Merek bagi Usaha Mikro dan Kecil', diperiksa: '2026-11-23', catatan: 'tarif PP 30/2026' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/merek/pengenalan', judul: 'Jenis Merek dan Tanda yang Tidak Bisa Didaftarkan', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/hak-cipta/pengenalan', judul: 'Mengenal Hak Cipta atas Karya', diperiksa: '2026-11-23', catatan: 'UU 28/2014' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/hak-cipta/syarat-prosedur', judul: 'Dokumen dan Langkah Mencatatkan Hak Cipta', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/desain-industri/pengenalan', judul: 'Mengenal Perlindungan Desain Industri', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/desain-industri/syarat-prosedur', judul: 'Syarat Permohonan Desain Industri', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/indikasi-geografis/pengenalan', judul: 'Mengenal Indikasi Geografis untuk Produk Khas Daerah', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/faq/daftar-faq/hak-cipta/Hc-umum', judul: 'Tanya Jawab Seputar Perlindungan Hak Cipta', diperiksa: '2026-11-23' },
  { lembaga: 'djki', url: 'https://dgip.go.id/menu-utama/paten/pengenalan', judul: 'Mengenal Paten dan Paten Sederhana', diperiksa: '2026-11-23' },
  { lembaga: 'djp', url: 'https://pajak.go.id/id/wajib-pajak/pribadi/usaha/pendaftaran/wajib-pajak-baru', judul: 'Mendaftar NPWP bagi Orang Pribadi yang Menjalankan Usaha', diperiksa: '2026-11-23', catatan: 'panduan Wajib Pajak Orang Pribadi Usaha (Coretax), terbit 20 Nov 2026' },
  { lembaga: 'djp', url: 'https://pajak.go.id/id/wajib-pajak/pribadi/usaha/pelaporan/spt-tahunan', judul: 'Batas Waktu dan Tata Cara Lapor SPT Tahunan Pemilik Usaha', diperiksa: '2026-11-23' },
  { lembaga: 'djp', url: 'https://pajak.go.id/id/wajib-pajak/pribadi/usaha/pendaftaran/pengukuhan-pkp', judul: 'Pengukuhan Pengusaha Kena Pajak (PKP) bagi Pemilik Usaha', diperiksa: '2026-11-23', catatan: 'pengganti pajak.go.id/id/pengusaha-kena-pajak yang 404' },
  { lembaga: 'djp', url: 'https://pajak.go.id/id/wajib-pajak/pribadi/usaha/pendaftaran/wajib-pajak-nonaktif', judul: 'Status Wajib Pajak Nonaktif saat Usaha Berhenti', diperiksa: '2026-11-23' },
  { lembaga: 'djp', url: 'https://pajak.go.id/id/wajib-pajak/pribadi/usaha/pendaftaran/perubahan-data', judul: 'Mengubah Data Wajib Pajak, dari Nomor HP sampai Alamat', diperiksa: '2026-11-23' },
  { lembaga: 'djp', url: 'https://pajak.go.id/id/wajib-pajak/pribadi/usaha/pelaporan/spt-masa-ppn', judul: 'Kewajiban SPT Masa PPN bagi Pemilik Usaha yang Sudah PKP', diperiksa: '2026-11-23' },
  { lembaga: 'bi', url: 'https://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/Pages/cara-membuat-QRIS.aspx', judul: 'Langkah Mendaftar QRIS sebagai Merchant', diperiksa: '2026-11-23', catatan: 'data merchant per Juni 2025' },
  { lembaga: 'bi', url: 'https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/QRIS/default.aspx', judul: 'Mengenal QRIS untuk Pembayaran Usaha', diperiksa: '2026-11-23' },
  { lembaga: 'bi', url: 'https://www.bi.go.id/id/rupiah/pencegahan-rupiah-palsu/default.aspx', judul: 'Ciri Uang Rupiah Asli dan Cara Mengenali yang Palsu', diperiksa: '2026-11-23' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/cara-mendaftar-jadi-peserta.html', judul: 'Cara Mendaftar Peserta BPJS Ketenagakerjaan', diperiksa: '2026-11-23' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/cara-membayar-iuran.html', judul: 'Pilihan Cara Membayar Iuran BPJS Ketenagakerjaan', diperiksa: '2026-11-23' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/artikel/17510/artikel-ingin-jadi-wirausaha,-apa-saja-ya-keuntungan-dan-persiapannya?.bpjs', judul: 'Keuntungan dan Persiapan Sebelum Memulai Wirausaha', diperiksa: '2026-11-23' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/artikel/17374/artikel-manfaat-perlindungan-bpjs-ketenagakerjaan-untuk-mitra-ojol.bpjs', judul: 'Perlindungan Jaminan Sosial bagi Mitra Ojol', diperiksa: '2026-11-23' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/artikel/17360/artikel-berbagai-hal-seputar-freelancing-yang-perlu-kamu-tahu.bpjs', judul: 'Hal yang Perlu Diketahui Freelancer', diperiksa: '2026-11-23' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/artikel/17422/artikel-beda-jht-dan-jp,-cari-tahu-informasi-selengkapnya-yuk!.bpjs', judul: 'Beda Jaminan Hari Tua dan Jaminan Pensiun', diperiksa: '2026-11-23', catatan: 'PP 46/2015' },
  { lembaga: 'bpjstk', url: 'https://www.bpjsketenagakerjaan.go.id/artikel/17417/artikel-jenis-kecelakaan-yang-dijamin-oleh-jkk-bpjs-ketenagakerjaan.bpjs', judul: 'Jenis Kecelakaan yang Dijamin Program JKK', diperiksa: '2026-11-23' },
  { lembaga: 'djbc', url: 'https://www.beacukai.go.id/klinik-ekspor', judul: 'Klinik Ekspor Bea Cukai untuk UMKM', diperiksa: '2026-11-23' },
  { lembaga: 'djbc', url: 'https://www.beacukai.go.id/tata-laksana-ekspor', judul: 'Prosedur Ekspor Barang lewat Bea Cukai', diperiksa: '2026-11-23', catatan: 'PMK 4/2025' },
  { lembaga: 'djbc', url: 'https://www.beacukai.go.id/registrasi-kepabeanan', judul: 'Registrasi Kepabeanan bagi Eksportir dan Importir', diperiksa: '2026-11-23' },
  { lembaga: 'djbc', url: 'https://www.beacukai.go.id/fasilitas-kite', judul: 'Fasilitas Kemudahan Impor Tujuan Ekspor (KITE)', diperiksa: '2026-11-23' },
  { lembaga: 'djbc', url: 'https://www.beacukai.go.id/impor-untuk-dipakai', judul: 'Prosedur Impor Barang untuk Dipakai', diperiksa: '2026-11-23' },
  { lembaga: 'lpdb', url: 'https://www.lpdb.go.id/alur-proses/', judul: 'Syarat Koperasi Mengajukan Dana Bergulir LPDB', diperiksa: '2026-11-23' },
  { lembaga: 'lpdb', url: 'https://www.lpdb.go.id/faq/', judul: 'Tanya Jawab Pembiayaan Dana Bergulir LPDB', diperiksa: '2026-11-23', catatan: 'UMKM tidak bisa langsung, harus lewat koperasi' },
];

/**
 * Halaman daftar artikel edukasi resmi. Polanya seperti LEMBAGA di sumber-lembaga.mjs.
 * @type {{id:string, nama:string, label:string, singkat:string[], daftar:string, asal:string, pola:RegExp, urutanJudul?:string[]}[]}
 */
export const DAFTAR_PANDUAN = [];

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

const judulDariSlug = (u) => decodeURIComponent((new URL(u).pathname.split('/').filter(Boolean).pop() || '').replace(/\.(aspx|html?)$/, '')).replace(/[-_]+/g, ' ');

// judulKurasi: jalan.mjs memakainya lagi sesudah ambilIsi, yang menimpa k.judul dengan judul halaman.
const kandidatDari = (s, { id, url, judul, kurasi, urutan }) => ({
  jenis: 'evergreen', asal: 'lembaga', kurasi,
  sumber: { singkat: s.singkat, urutanJudul: s.urutanJudul }, sumberId: `panduan-${id}`,
  sumberNama: s.nama, sumberLabel: s.label, url, kunci: kunciUrl(url), judul, ...(kurasi ? { judulKurasi: judul } : {}),
  ringkas: '', terbit: '', urutanDaftar: urutan,
});

/** Kandidat dari daftar kurasi, bergiliran per lembaga. */
export function kandidatKurasi(daftar = PANDUAN) {
  return bergiliran(daftar, (p) => p.lembaga).map((p, i) => {
    const l = LEMBAGA_PANDUAN[p.lembaga];
    if (!l) throw new Error(`PANDUAN: lembaga "${p.lembaga}" tidak ada di LEMBAGA_PANDUAN (${p.url})`);
    return kandidatDari(l, { id: p.lembaga, url: p.url, judul: p.judul, kurasi: true, urutan: i + 1 });
  });
}

/**
 * Urutkan bergiliran per lembaga (A1, B1, C1, A2, B2, ...) supaya artikel evergreen yang
 * berurutan tidak semuanya dari lembaga yang sama. Urutan di dalam satu lembaga dipertahankan.
 */
export function bergiliran(daftar, kunci) {
  const kelompok = new Map();
  for (const x of daftar) {
    const k = kunci(x);
    if (!kelompok.has(k)) kelompok.set(k, []);
    kelompok.get(k).push(x);
  }
  const antre = [...kelompok.values()];
  const hasil = [];
  for (let i = 0; antre.some((a) => i < a.length); i++) for (const a of antre) if (i < a.length) hasil.push(a[i]);
  return hasil;
}

/**
 * Kandidat evergreen A: daftar kurasi lebih dulu, lalu temuan dari halaman daftar.
 * @returns {Promise<{kandidat: object[], laporan: object[]}>}
 */
export async function kumpulkanPanduan({ perDaftar = 10 } = {}) {
  const laporan = [{ id: 'panduan-kurasi', nama: 'Panduan resmi (daftar kurasi)', jenis: 'panduan', status: PANDUAN.length ? 'ok' : 'kosong', tautan: PANDUAN.length, catatan: '' }];
  const kurasi = kandidatKurasi();
  const temuan = [];
  const sudah = new Set(kurasi.map((k) => k.kunci));
  await Promise.all(DAFTAR_PANDUAN.map(async (s) => {
    const lap = { id: `panduan-${s.id}`, nama: `${s.label} (daftar panduan)`, jenis: 'panduan', status: 'ok', tautan: 0, catatan: '' };
    laporan.push(lap);
    try {
      const izin = await izinRobots(s.daftar);
      if (!izin.boleh) throw new Error(izin.alasan);
      const r = await ambil(s.daftar, { timeout: 25000 });
      let n = 0;
      for (const m of r.teks.matchAll(s.pola)) {
        const url = m[1].startsWith('http') ? m[1] : s.asal + m[1];
        const kunci = kunciUrl(url);
        if (sudah.has(kunci)) continue;
        sudah.add(kunci);
        temuan.push(kandidatDari(s, { id: s.id, url, judul: teksTautan(r.teks, m[1]) || judulDariSlug(url), kurasi: false, urutan: ++n }));
        if (n >= perDaftar) break;
      }
      lap.tautan = n;
      if (!n) { lap.status = 'kosong'; lap.catatan = 'pola tautan tidak menemukan laman (struktur halaman berubah?)'; }
    } catch (e) {
      lap.status = 'gagal';
      lap.catatan = String(e.message).slice(0, 120);
    }
  }));
  return { kandidat: [...kurasi, ...bergiliran(temuan, (k) => k.sumberId)], laporan };
}
