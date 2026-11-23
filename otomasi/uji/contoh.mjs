// Bahan dan artikel contoh untuk uji penjaga. Artikel BAIK harus lolos; varian buruk masing-masing
// hanya mengubah satu hal, supaya jelas penjaga mana yang menangkapnya.
export const BAHAN = `SUMBER: Kementerian Contoh
URL: https://contoh.go.id/siaran-pers/1
TANGGAL TERBIT SUMBER: 14 November 2026
JUDUL SUMBER: Penyaluran KUR Tembus Rp260,8 Triliun, Jangkau 4 Juta Debitur

Jakarta, 14 November 2026 - Kementerian Contoh mencatat realisasi kredit usaha rakyat (KUR) mencapai Rp260,8 triliun hingga 21 Oktober 2026. Angka itu setara 89,93 persen dari target Rp290 triliun.
Penyaluran sudah menjangkau 4 juta debitur. Sebanyak 1,6 juta di antaranya merupakan debitur baru dari kalangan pelaku usaha mikro.
"Kami mendapatkan penugasan yang agak lebih berat dari yang sebelumnya," ujar Menteri Contoh Budi Santoso di Jakarta.
Pemerintah mewajibkan 65 persen penyaluran KUR mengalir ke sektor produksi. Dasar hukumnya Peraturan Menteri Nomor 7 Tahun 2026. Penyaluran ke sektor produksi sudah mencapai 65,9 persen, yang terbesar sepanjang program berjalan.
Denda bagi bank penyalur yang melanggar paling banyak Rp2.000.000.000. Program ini berjalan sejak 2 tahun lalu dan menyasar UMKM di seluruh Indonesia.`;

export const KONTEKS = { jenis: 'berita', asal: 'lembaga', bahan: BAHAN, judulSumber: 'Penyaluran KUR Tembus Rp260,8 Triliun, Jangkau 4 Juta Debitur', judulTerbaru: ['Harga Cabai Rawit Masih Mahal di Pasar Tradisional'] };

// Kalimat netral tanpa angka, superlatif, atau kata tidak baku, untuk memenuhi panjang minimal.
const NETRAL = [
  'Program ini ditujukan untuk membantu pelaku usaha kecil memperoleh modal kerja.',
  'Pemerintah menyalurkan kredit tersebut melalui bank penyalur yang sudah ditunjuk.',
  'Setiap bank penyalur memiliki prosedur pengajuan yang perlu dipelajari lebih dulu.',
  'Calon debitur sebaiknya menyiapkan catatan usaha yang rapi sebelum datang ke bank.',
  'Catatan keuangan yang tertib memudahkan petugas menilai kemampuan membayar.',
  'Pelaku usaha juga perlu memastikan bahwa dokumen identitas dan izin usahanya lengkap.',
  'Informasi resmi tentang syarat dan jadwal tersedia di kanal milik kementerian.',
  'Pembaca disarankan tidak memercayai pihak yang menjanjikan pencairan instan dengan imbalan.',
  'Kredit tetap harus dibayar sesuai jadwal yang disepakati dengan bank.',
  'Rencana penggunaan dana yang jelas membantu usaha tetap sehat setelah menerima pinjaman.',
];

function isiPanjang(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(NETRAL[i % NETRAL.length]);
  return out.join(' ');
}

export function artikelBaik() {
  return {
    layak: true,
    alasan: '',
    title: 'Penyaluran KUR Tembus Rp260,8 Triliun, Siapa Saja yang Sudah Dapat?',
    dek: 'Kementerian Contoh mencatat penyaluran KUR menjangkau 4 juta debitur. Sektor produksi menyerap 65,9 persen.',
    kanal: 'keuangan',
    takeaways: [
      'Realisasi KUR mencapai Rp260,8 triliun hingga 21 Oktober 2026.',
      'Penyaluran menjangkau 4 juta debitur, termasuk 1,6 juta debitur baru.',
      'Sektor produksi menyerap 65,9 persen, di atas kewajiban 65 persen.',
    ],
    body: [
      { type: 'p', text: 'Menurut siaran pers Kementerian Contoh, realisasi kredit usaha rakyat mencapai Rp260,8 triliun hingga 21 Oktober 2026. Jumlah itu setara 89,93 persen dari target Rp290 triliun.' },
      { type: 'p', text: `Penyaluran disebut sudah menjangkau 4 juta debitur. ${isiPanjang(6)}` },
      { type: 'quote', text: 'Kami mendapatkan penugasan yang agak lebih berat dari yang sebelumnya.' },
      { type: 'h2', text: 'Sektor produksi di atas kewajiban' },
      { type: 'p', text: `Pemerintah mewajibkan 65 persen penyaluran mengalir ke sektor produksi, sesuai Peraturan Menteri Nomor 7 Tahun 2026. ${isiPanjang(10)}` },
      { type: 'h2', text: 'Apa artinya bagi pelaku usaha' },
      { type: 'p', text: isiPanjang(12) },
    ],
    imgAlt: 'Ilustrasi meja kasir toko kecil dengan keranjang anyaman',
    illustration: 'a tidy small shop counter with woven baskets and potted plants',
  };
}

/** Salinan dengan satu perubahan. */
export function ubah(fn) {
  const a = artikelBaik();
  fn(a);
  return a;
}

// ------------------------------------------------------------------ evergreen (laman panduan resmi)

export const BAHAN_PANDUAN = `SUMBER: Kementerian Contoh
URL: https://contoh.go.id/layanan/kur
TANGGAL HALAMAN: tidak tercantum
DIAKSES: 23 November 2026
JUDUL SUMBER: Syarat dan Cara Mengajukan Kredit Usaha Rakyat

Kredit usaha rakyat (KUR) adalah kredit atau pembiayaan modal kerja dan investasi kepada usaha mikro, kecil, dan menengah yang produktif dan layak, tetapi belum memiliki agunan tambahan yang cukup.
Calon debitur KUR mikro wajib memiliki usaha produktif yang sudah berjalan paling sedikit 6 bulan.
Calon debitur menyiapkan kartu tanda penduduk (KTP), kartu keluarga, dan surat keterangan usaha atau Nomor Induk Berusaha (NIB).
Plafon KUR mikro paling banyak Rp100 juta per debitur. Suku bunga KUR mikro sebesar 6 persen per tahun.
Pengajuan dilakukan di bank penyalur KUR. Calon debitur tidak dipungut biaya pengajuan.
Informasi lebih lanjut dapat ditanyakan ke kantor cabang bank penyalur terdekat.`;

export const KONTEKS_PANDUAN = { jenis: 'evergreen', asal: 'lembaga', bahan: BAHAN_PANDUAN, judulSumber: 'Syarat dan Cara Mengajukan Kredit Usaha Rakyat', judulTerbaru: ['Harga Cabai Rawit Masih Mahal di Pasar Tradisional'] };

export function artikelEvergreen() {
  return {
    layak: true,
    alasan: '',
    title: '3 Syarat Mengajukan KUR Mikro yang Perlu Disiapkan',
    dek: 'Menurut laman resmi Kementerian Contoh, calon debitur KUR mikro perlu menyiapkan usaha yang berjalan, dokumen identitas, dan izin usaha.',
    kanal: 'keuangan',
    takeaways: [
      'Usaha harus sudah berjalan paling sedikit 6 bulan sebelum mengajukan KUR mikro.',
      'Dokumen yang disiapkan meliputi KTP, kartu keluarga, dan surat keterangan usaha atau NIB.',
      'Pengajuan dilakukan lewat bank penyalur tanpa biaya pengajuan.',
    ],
    body: [
      { type: 'p', text: `Menurut laman resmi Kementerian Contoh, kredit usaha rakyat atau KUR adalah pembiayaan modal kerja dan investasi untuk usaha mikro, kecil, dan menengah yang produktif. ${isiPanjang(4)}` },
      { type: 'h2', text: '1. Usaha sudah berjalan' },
      { type: 'p', text: `Calon debitur KUR mikro wajib punya usaha produktif yang sudah berjalan paling sedikit 6 bulan. ${isiPanjang(7)}` },
      { type: 'h2', text: '2. Dokumen identitas dan izin usaha' },
      { type: 'p', text: `Siapkan KTP, kartu keluarga, serta surat keterangan usaha atau NIB. ${isiPanjang(7)}` },
      { type: 'h2', text: '3. Ajukan lewat bank penyalur' },
      { type: 'p', text: `Pengajuan dilakukan di bank penyalur, dan calon debitur tidak dipungut biaya. Plafonnya paling banyak Rp100 juta per debitur dengan bunga 6 persen per tahun. ${isiPanjang(7)}` },
      { type: 'h2', text: 'Yang perlu disiapkan pelaku usaha' },
      { type: 'p', text: `Kumpulkan dokumen lebih dulu supaya pengajuan lancar. Aturan dan syarat bisa berubah, jadi cek ketentuan terbaru di laman resmi Kementerian Contoh atau tanyakan ke bank penyalur. ${isiPanjang(5)}` },
    ],
    imgAlt: 'Ilustrasi meja kerja rapi dengan tanaman kecil',
    illustration: 'a tidy wooden desk with a potted plant and neatly stacked plain boxes',
  };
}

/** Salinan artikel evergreen dengan satu perubahan. */
export function ubahEvergreen(fn) {
  const a = artikelEvergreen();
  fn(a);
  return a;
}
