// Angka-angka pipeline di satu tempat. Yang bertanda "keputusan pemilik" berasal dari pemilik
// situs (15 Nov 2026); sisanya pilihan awal pembuat pipeline dan boleh diubah.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIR_BERITA = join(ROOT, 'data', 'berita');
export const DIR_GAMBAR = join(ROOT, 'public', 'assets', 'berita');
export const DIR_PUBLIC = join(ROOT, 'public');
export const BERKAS_STATUS = join(DIR_BERITA, '_status.json');

// Keputusan pemilik: paling banyak 12 berita + 3 tips per hari WIB, kurang tidak apa-apa.
export const KUOTA = { berita: 12, tips: 3 };
// Keputusan pemilik: per putaran paling banyak 3 berita + 1 tips.
export const PER_PUTARAN = { berita: 3, tips: 1 };

// Jendela terbit (jam WIB). Batas kumulatif naik tiap jam dari `mulai` sampai kuota penuh pada
// `penuh`; jam sesudahnya sampai `akhir` menjadi waktu kejar. Dipilih supaya sekitar 8 putaran
// efektif per hari (GitHub membuang kira-kira separuh event schedule) tetap mencapai kuota.
export const JENDELA = { mulai: 6, penuh: 19, akhir: 22 };

// Berapa kandidat yang boleh DICOBA ditulis per putaran (termasuk yang akhirnya ditolak penjaga),
// supaya satu kandidat bermasalah tidak menghabiskan putaran dan biaya tetap terbatas.
export const COBA_TULIS_MAKS = { berita: 6, tips: 3 };
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

// Bahan minimum (karakter teks sumber yang bersih). Di bawah ini kandidat dilewati.
export const BAHAN_MIN = { berita: 1200, tips: 500 };
// Panjang isi artikel (kata, hanya body). Berita: keputusan pemilik sekitar 300-800.
export const PANJANG_KATA = { berita: [300, 800], tips: [200, 650] };
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

export const UA_BAWAAN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export const UA = () => process.env.BERITA_UA || UA_BAWAAN;
