// Data ekosistem Kasisolusi untuk beranda (mockup Sep 2026, revisi tracker 23 Sep 2026).
// Semua isi di sini diperiksa langsung ke sumbernya pada 15 September 2026.
// Yang tidak ada sumbernya sengaja TIDAK dimasukkan: kerja sama Cyber University,
// angka "50K+ community", produk Wellness, dan handle @kbi.* dari mockup.

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

// Produk pilihan dari toko resmi lynk.id/kasisolusi (diperiksa 23 Sep 2026).
// Menggantikan section Wellness sesuai tracker revisi. Sengaja tanpa harga karena
// harga dan promo di Lynk.id berubah-ubah; nama dirapikan dari huruf kapital saja.
// Gambar = sampul produk dari cdn.lynkid.my.id, diperkecil ke 600px dan disajikan lokal.
export const produk = {
  store: 'https://lynk.id/kasisolusi',
  items: [
    { jenis: 'Event Bedah Buku', nama: 'Unboxing Your Purpose: Keluar dari Jebakan Rasa Ragu, People Pleasing, dan Takut Dinilai Orang', url: 'https://lynk.id/kasisolusi/page/unboxingyourpurpose', img: '/assets/produk/unboxing-your-purpose.webp' },
    { jenis: 'Buku', nama: 'Saat Aku Mengerti Diriku, oleh Reinat Fuad (Co-Founder Kasisolusi)', url: 'https://lynk.id/kasisolusi/96vmwgn4jml9', img: '/assets/produk/saat-aku-mengerti-diriku.webp' },
    { jenis: 'Rekaman Kelas', nama: 'Personal Branding Master Class bersama Deryansha', url: 'https://lynk.id/kasisolusi/zkzxrx5vzv8d', img: '/assets/produk/personal-branding-master-class.webp' },
    { jenis: 'Rekaman Kelas', nama: 'Creative Marketing Ideas Course bersama Deryansha', url: 'https://lynk.id/kasisolusi/vv76qzvjzwq4', img: '/assets/produk/creative-marketing-ideas.webp' },
    { jenis: 'Kelas', nama: 'Kelas Solusi Bikin Brand bersama Pak Bi, Deryansha, dan Dion Subiakto', url: 'https://lynk.id/kasisolusi/page/solusi-bikin-brand', img: '/assets/produk/solusi-bikin-brand.webp' },
    { jenis: 'Rekaman Kelas', nama: 'Rahasia Membangun Portofolio Aset bersama Steven Anderson', url: 'https://lynk.id/kasisolusi/l6dxdx1k6p72', img: '/assets/produk/portofolio-aset.webp' },
    { jenis: 'Rekaman Workshop', nama: 'Bedah Diri: Lebih Baik Jadi Karyawan atau Pengusaha? bersama Coach Rene', url: 'https://lynk.id/kasisolusi/3j63nezx2y3e', img: '/assets/produk/bedah-diri.webp' },
    { jenis: 'Buku', nama: 'Rumus Anti Nganggur, oleh Coach Rene', url: 'https://lynk.id/a/5712994563/2w1v6o3mkldv', img: '/assets/produk/rumus-anti-nganggur.webp' },
  ],
};

// Tujuan menu Bantuan yang benar-benar ada.
export const bantuan = [
  { label: 'FAQ KBI', url: `${KBI}/faq/`, external: true },
  { label: 'Kerja Sama Brand', url: 'https://home.kasisolusi.co.id/welcome/', external: true },
  { label: 'Program Kasisolusi', url: '/program' },
  { label: 'Cari', url: '/cari' },
];
