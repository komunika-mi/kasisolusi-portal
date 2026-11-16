// Data ekosistem Kasisolusi untuk beranda (mockup Sep 2026, revisi tracker 23 Sep 2026).
// Semua isi di sini diperiksa langsung ke sumbernya pada 15 September 2026.
// Yang tidak ada sumbernya sengaja TIDAK dimasukkan: kerja sama Cyber University,
// angka "50K+ community", produk Wellness, dan handle @kbi.* dari mockup.

import { kbiPage } from './kbi.mjs';

export const DIPERIKSA = '2026-09-15';

// Pendiri. Sumber: linkedin.com/in/deryansha-azhary-548225150 (Founder & CEO of
// Kasisolusi), bio Instagram @deryanshaa, inilah.com/deryansha-azhary.
export const founder = {
  name: 'Deryansha',
  fullName: 'Deryansha Azhary',
  role: 'Founder Kasisolusi',
};

// Cuplikan dari tab Shorts youtube.com/@kasisolusi. Lima dengan tayangan
// tertinggi di luar topik politik, dilewati yang covernya memuat timecode rekaman
// (LaBbkCBtcZU). Judul dirapikan ejaannya saja.
export const shorts = [
  { id: 'Y8oydkYnkoY', title: 'Coach Justin: Semua Orang Bisa Bikin Konten, Kapan Kamu Mulai?', views: '37 rb' },
  { id: 'd7TpZ42HiBQ', title: 'Owner Oseng Endok Ungkap Satu Tempat yang Tak Tersentuh Api Saat Outletnya Terbakar', views: '27 rb' },
  { id: 'RD-PgYCOQb8', title: 'Ini yang Perlu Kamu Lakukan Kalau Punya Uang Rp1 Miliar', views: '20 rb' },
  { id: 'Qbw5_Nu7pHI', title: 'Nama Besar Raffi Ahmad Ternyata Belum Cukup untuk Mempertahankan Bisnis?', views: '7,3 rb' },
  { id: 'I69IALCSaRo', title: 'Merekrut Karyawan: Lebih Lihat Skill dan Pengalaman, atau Attitude?', views: '7,2 rb' },
];

// Kasisolusi Business Institute. Sumber: kasisolusibusinessinstitute.com dan
// WP REST API-nya (/wp-json/wp/v2/etn, /wp-json/wp/v2/etn_category).
// Halaman Contact KBI masih isian contoh tema (info@example.com), jadi tidak ditautkan.
const KBI = 'https://kasisolusibusinessinstitute.com';
export const kbi = {
  name: 'Kasisolusi Business Institute',
  short: 'KBI',
  url: `${KBI}/`,
  faq: `${KBI}/faq/`,
  tagline: "We Don't Teach Business. We Solve Leadership Pressure.",
  description:
    'Platform pembelajaran strategis untuk business owner dan decision-maker yang menghadapi kompleksitas nyata dalam bisnis.',
  // Daftar school, program, dan produk edukasi kini ada di data/kbi.mjs (tracker 8 Okt 2026).
};

// Produk pilihan di beranda. Susunan dari Ricky (WA 16 Nov 2026, dipasang hari itu): lima
// produk pertama SAMA dengan Produk Edukasi di halaman KBI (diambil langsung dari data/kbi.mjs,
// jadi ikut berubah bila susunan KBI berubah), urutannya mengikuti pesan Ricky, ditambah tiga
// produk partner. Menggantikan susunan 23 Sep 2026 yang 6 dari 8 tautannya sudah mati.
// Sengaja tanpa harga karena harga dan promo di Lynk.id berubah-ubah; nama dirapikan dari huruf
// kapital. Gambar = sampul produk dari cdn.lynkid.my.id, 600x600 WebP, disajikan lokal.
// Mahir Digital: semua gambar produknya rusak (403) bahkan di halaman Lynk-nya sendiri
// (dicek di peramban 16 Nov 2026), jadi kartunya memakai logo profil toko @mahirdigital.id.
// Tautan disajikan dengan standar UTM situs (utm() di data/kbi.mjs) di build.mjs.
const URUTAN_KBI = ['saat_aku_mengerti_diriku', 'saat_terpuruk_mereka_bangkit', 'creative_marketing_ideas', 'personal_branding_master_class', 'materi_affiliate_adli_hibatul'];
export const produk = {
  store: 'https://lynk.id/kasisolusi',
  items: [
    ...URUTAN_KBI.map((slug) => {
      const p = kbiPage.produk.items.find((x) => x.slug === slug);
      if (!p) throw new Error(`produk KBI ${slug} tidak ada di data/kbi.mjs`);
      return p;
    }),
    { slug: 'rumus_anti_nganggur', jenis: 'Buku', nama: 'Rumus Anti Nganggur, oleh Coach Rene', url: 'https://lynk.id/lenterahatistore/2w1v6o3mkldv', img: '/assets/produk/rumus-anti-nganggur.webp' },
    { slug: 'mahir_digital', jenis: 'Kelas Online', nama: 'Mahir Digital: Belajar Digital Marketing dari Gaptek sampai Bisa Praktik', url: 'https://lynk.id/mahirdigital.id/pYX5WRP', img: '/assets/produk/mahir-digital.webp' },
    { slug: 'belajar_ai_anjas_maradita', jenis: 'Kelas Online', nama: 'Belajar Lengkap AI Tools Penghasil Cuan 2026 bersama Anjas Maradita', url: 'https://lynk.id/belajarai/NRr6Z5W', img: '/assets/produk/belajar-ai-anjas-maradita.webp' },
  ],
};

// Tujuan menu Bantuan yang benar-benar ada.
export const bantuan = [
  { label: 'FAQ KBI', url: `${KBI}/faq/`, external: true },
  { label: 'Kerja Sama Brand', url: 'https://home.kasisolusi.co.id/welcome/', external: true },
  { label: 'Program Kasisolusi', url: '/program' },
  { label: 'Cari', url: '/cari' },
];
