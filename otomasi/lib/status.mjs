// Catatan pipeline di data/berita/_status.json: hitungan harian, kunci sumber yang sudah
// diproses (14 hari), dan sidik gambar. Berkas ini ikut di-commit bersama artikel, jadi:
// - jangan menulis nilai yang berubah tiap putaran (misalnya "terakhir jalan"), karena tiap
//   perubahan berarti commit dan deploy Vercel;
// - jangan disunting tangan selagi otomasi aktif (rebase bisa menggabungkannya diam-diam).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BERKAS_STATUS, HARI_SIMPAN, HARI_SIMPAN_GAMBAR, KUOTA, PER_PUTARAN, JENDELA } from './konfigurasi.mjs';

const KOSONG = () => ({ versi: 1, hari: {}, kunci: {}, gambar: {} });

export function bacaStatus(berkas = BERKAS_STATUS) {
  if (!existsSync(berkas)) return KOSONG();
  try {
    const s = JSON.parse(readFileSync(berkas, 'utf8'));
    return { ...KOSONG(), ...s, hari: s.hari || {}, kunci: s.kunci || {}, gambar: s.gambar || {} };
  } catch (e) {
    // Berkas rusak tidak boleh diam-diam dianggap kosong: kuota dan kunci lama akan terlupa.
    throw new Error(`_status.json rusak: ${e.message}`);
  }
}

const tambahHari = (tgl, n) => new Date(Date.parse(`${tgl}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

/** Buang catatan yang lebih tua dari jendela simpan. */
export function pangkas(st, hariIni) {
  const batas = tambahHari(hariIni, -HARI_SIMPAN);
  const batasGambar = tambahHari(hariIni, -HARI_SIMPAN_GAMBAR);
  for (const t of Object.keys(st.hari)) if (t < batas) delete st.hari[t];
  for (const [k, v] of Object.entries(st.kunci)) if (!v?.t || v.t < batas) delete st.kunci[k];
  for (const [k, v] of Object.entries(st.gambar)) if (!v?.t || v.t < batasGambar) delete st.gambar[k];
  return st;
}

/** Tulis hanya kalau isinya berubah. Kunci diurutkan supaya diff commit rapi. */
export function simpanStatus(st, berkas = BERKAS_STATUS) {
  const urut = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  const isi = `${JSON.stringify({
    versi: 1,
    catatan: 'Dikelola otomasi/jalan.mjs. Jangan disunting tangan selagi otomasi aktif.',
    hari: urut(st.hari),
    kunci: urut(st.kunci),
    gambar: urut(st.gambar),
  }, null, 1)}\n`;
  const lama = existsSync(berkas) ? readFileSync(berkas, 'utf8') : '';
  if (lama === isi) return false;
  mkdirSync(dirname(berkas), { recursive: true });
  writeFileSync(berkas, isi, 'utf8');
  return true;
}

export const hitungan = (st, tgl) => st.hari[tgl] || { berita: 0, tips: 0 };

export function catatTerbit(st, tgl, jenis) {
  const h = (st.hari[tgl] ||= { berita: 0, tips: 0 });
  h[jenis] = (h[jenis] || 0) + 1;
}

export function catatBiaya(st, tgl, usd) {
  if (!usd) return;
  const h = (st.hari[tgl] ||= { berita: 0, tips: 0 });
  h.biayaUsd = Math.round(((h.biayaUsd || 0) + usd) * 1e6) / 1e6;
}

/**
 * Apakah kunci sumber boleh diproses lagi?
 * terbit/ditolak = tidak (selama 14 hari tercatat); gagal (galat teknis) = boleh sampai 3 kali.
 */
export function bolehDiproses(st, kunci) {
  const c = st.kunci[kunci];
  if (!c) return true;
  if (c.hasil === 'gagal') return (c.coba || 1) < 3;
  return false;
}

export function catatKunci(st, kunci, data) {
  const lama = st.kunci[kunci];
  const coba = data.hasil === 'gagal' ? (lama?.coba || 0) + 1 : undefined;
  st.kunci[kunci] = { ...data, ...(coba ? { coba } : {}) };
}

// ------------------------------------------------------------------ kuota dan laju

/**
 * Batas kumulatif per jam WIB: naik rata dari jam JENDELA.mulai sampai kuota penuh pada
 * JENDELA.penuh. Sebelum jendela = 0. Contoh berita (12): 06=1, 08=3, 10=5, 12=6, 14=8, 16=10, 18=12.
 */
export function batasKumulatif(kuota, jam) {
  if (jam < JENDELA.mulai) return 0;
  if (jam >= JENDELA.penuh) return kuota;
  const slot = JENDELA.penuh - JENDELA.mulai + 1;
  return Math.min(kuota, Math.ceil((kuota * (jam - JENDELA.mulai + 1)) / slot));
}

/**
 * Jatah putaran ini. `terbit` = yang sudah terbit hari ini {berita, tips}.
 * paksa: abaikan jendela jam dan batas kumulatif; batas harian dan per putaran tetap berlaku.
 */
export function jatahPutaran({ terbit, jam, paksa = false }) {
  const hasil = {};
  const alasan = [];
  const diLuarJendela = jam < JENDELA.mulai || jam > JENDELA.akhir;
  for (const jenis of ['berita', 'tips']) {
    const sudah = terbit[jenis] || 0;
    const sisaHarian = Math.max(0, KUOTA[jenis] - sudah);
    const sisaLaju = paksa ? sisaHarian : diLuarJendela ? 0 : Math.max(0, batasKumulatif(KUOTA[jenis], jam) - sudah);
    hasil[jenis] = Math.min(PER_PUTARAN[jenis], sisaHarian, sisaLaju);
    if (!sisaHarian) alasan.push(`${jenis}: kuota harian ${KUOTA[jenis]} sudah penuh`);
    else if (!hasil[jenis]) alasan.push(diLuarJendela && !paksa ? `${jenis}: di luar jendela ${JENDELA.mulai}.00-${JENDELA.akhir}.59 WIB` : `${jenis}: menunggu jam berikutnya (batas jam ${jam} = ${batasKumulatif(KUOTA[jenis], jam)}, sudah ${sudah})`);
  }
  return { ...hasil, alasan };
}
