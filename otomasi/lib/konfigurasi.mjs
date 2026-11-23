// Angka-angka pipeline di satu tempat. Yang bertanda "keputusan pemilik" berasal dari pemilik
// situs (15 Nov 2026); sisanya pilihan awal pembuat pipeline dan boleh diubah.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIR_BERITA = join(ROOT, 'data', 'berita');
export const DIR_GAMBAR = join(ROOT, 'public', 'assets', 'berita');
export const DIR_PUBLIC = join(ROOT, 'public');
export const BERKAS_STATUS = join(DIR_BERITA, '_status.json');

// Jenis artikel otomatis, sekaligus urutan pengerjaannya dalam satu putaran.
// - berita: siaran pers lembaga resmi (prioritas 1).
// - tips: episode podcast Kasisolusi, episode baru didahulukan.
// - evergreen (keputusan pemilik 23 Nov 2026): panduan yang tetap berguna berbulan-bulan, dengan
//   bahan dari laman panduan resmi pemerintah dan dari episode podcast arsip. Judul boleh lebih
//   memancing, tetapi tetap jujur (aturannya di penulis.mjs dan penjaga.mjs).
export const JENIS = ['berita', 'tips', 'evergreen'];

// Keputusan pemilik: paling banyak 12 berita + 3 tips per hari WIB, kurang tidak apa-apa.
// Evergreen 3 per hari (keputusan pemilik 23 Nov 2026).
export const KUOTA = { berita: 12, tips: 3, evergreen: 3 };
// Keputusan pemilik: per putaran paling banyak 3 berita + 1 tips. Evergreen 2 (pilihan awal 1,
// diubah 23 Nov 2026): GitHub hanya menjalankan sekitar 3 event schedule per hari (teramati 16-23
// Nov), dan cuma dua yang masuk jendela (sekitar 10-12 dan 18-21 WIB). Dengan 1 per putaran,
// evergreen hanya 2 per hari. Laju per jam di bawah tetap membatasi: paling banyak 1 sebelum
// pukul 10 dan 2 sebelum pukul 15 WIB.
export const PER_PUTARAN = { berita: 3, tips: 1, evergreen: 2 };

// Keputusan pemilik 23 Nov 2026: berita TIDAK lagi diambil dari situs media (detik, CNBC Indonesia,
// Liputan6, dan sejenisnya). Berita hanya dari siaran pers lembaga resmi; tips dari episode podcast
// Kasisolusi. 10 berita bersumber media yang sudah terbit diturunkan hari itu juga.
// lib/sumber-media.mjs dibiarkan karena radar umkm.go.id (situs pemerintah) ada di sana.
export const SUMBER_MEDIA = false;

// Jendela terbit (jam WIB). Batas kumulatif naik tiap jam dari `mulai` sampai kuota penuh pada
// `penuh`; jam sesudahnya sampai `akhir` menjadi waktu kejar. Dipilih supaya sekitar 8 putaran
// efektif per hari (GitHub membuang kira-kira separuh event schedule) tetap mencapai kuota.
export const JENDELA = { mulai: 6, penuh: 19, akhir: 22 };

// Berapa kandidat yang boleh DICOBA ditulis per putaran (termasuk yang akhirnya ditolak penjaga),
// supaya satu kandidat bermasalah tidak menghabiskan putaran dan biaya tetap terbatas.
export const COBA_TULIS_MAKS = { berita: 6, tips: 3, evergreen: 3 };
export const GAMBAR_MAKS_PER_PUTARAN = 6;
// Putaran berhenti memulai kandidat baru sesudah batas ini. Satu kandidat yang sedang jalan bisa
// makan sampai sekitar 9 menit lagi (3 panggilan model 120 detik + gambar), jadi job Actions
// dibatasi 30 menit.
export const BATAS_WAKTU_MS = 15 * 60e3;

// Catatan kunci sumber dan hitungan harian disimpan 14 hari; sidik gambar 180 hari.
export const HARI_SIMPAN = 14;
export const HARI_SIMPAN_GAMBAR = 180;

// Umur maksimal bahan. Media: 3x24 jam (keputusan pemilik; sejalan dengan "berita aktual" di
// penjelasan Pasal 43 huruf c UU 28/2014). Siaran pers lembaga: 7 hari (pilihan awal).
export const UMUR_MAKS_JAM = { media: 72, lembaga: 7 * 24, episodeBaru: 7 * 24 };

// Panduan resmi untuk evergreen tidak dibatasi umur seperti siaran pers, tetapi halaman yang
// tanggalnya tercantum dan lebih tua dari ini dilewati: aturan dan syarat bisa sudah berubah.
export const UMUR_MAKS_HARI_PANDUAN = 3 * 365;

// Bahan minimum (karakter teks sumber yang bersih). Di bawah ini kandidat dilewati. Evergreen
// dari laman panduan memakai angka evergreen; evergreen dari episode podcast memakai batas tips
// (bahannya sama-sama deskripsi resmi episode).
export const BAHAN_MIN = { berita: 1200, tips: 500, evergreen: 1200 };
// Panjang isi artikel (kata, hanya body). Berita: keputusan pemilik sekitar 300-800.
// Evergreen per asal bahan: laman panduan resmi (lembaga) atau episode podcast (youtube).
export const PANJANG_KATA = { berita: [300, 800], tips: [200, 650], evergreen: { lembaga: [350, 900], youtube: [200, 650] } };
export const JUDUL_MAKS = 70;

// Penulis. Keputusan pemilik: OpenRouter dengan model Cina murah. Bisa diganti lewat variabel
// repo OPENROUTER_MODEL (satu id, atau beberapa dipisah koma: yang pertama utama).
export const MODEL_BAWAAN = ['deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3-flash', 'qwen/qwen3.8-flash'];

export function daftarModel() {
  const isi = (process.env.OPENROUTER_MODEL || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!isi.length) return MODEL_BAWAAN;
  // Model yang dipilih pemilik di depan, cadangan bawaan tetap dipasang di belakangnya.
  return [...new Set([...isi, ...MODEL_BAWAAN])].slice(0, 3);
}

// Ilustrasi OpenAI. gpt-image-1 dimatikan OpenAI 23 Okt 2026 dan uji kering 15 Nov 2026 di runner
// mendapat 400 "The model 'gpt-image-1' does not exist". Halaman Deprecations OpenAI (dibaca
// 15 Nov 2026) menganjurkan gpt-image-2.6-flare ("fast, high-quality everyday image generation")
// atau -sunburst; gpt-image-2 sendiri sudah diumumkan mati 10 Feb 2027. Urutan ini dicoba dari
// depan: model yang ditolak karena tidak ada dilewati untuk sisa putaran. Bisa diganti lewat
// variabel repo OPENAI_IMAGE_MODEL (satu id, atau beberapa dipisah koma).
export const MODEL_GAMBAR_BAWAAN = ['gpt-image-2.6-flare', 'gpt-image-2.5-flare'];

export function daftarModelGambar() {
  const isi = (process.env.OPENAI_IMAGE_MODEL || '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...isi, ...MODEL_GAMBAR_BAWAAN])].slice(0, 3);
}

export const UA_BAWAAN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export const UA = () => process.env.BERITA_UA || UA_BAWAAN;
