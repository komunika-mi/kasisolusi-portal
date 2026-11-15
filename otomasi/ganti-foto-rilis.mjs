// Ganti sampul artikel otomatis yang SUDAH TERBIT dengan foto rilis lembaganya (pola The Signal,
// ganti-foto-asli.mjs). Dipakai untuk artikel yang terbit sebelum foto rilis dipasang (16 Nov 2026),
// atau bila pilihan foto berubah. Hanya artikel bersumber siaran pers lembaga (bukan media/tips).
//
//   node otomasi/ganti-foto-rilis.mjs <slug> [<slug> ...]
//
// Mengubah data/berita/<tanggal>-<slug>.json (foto, imgAlt, ilustrasi, fotoSumber),
// public/assets/berita/<slug>.webp, dan mencatat sidik foto di data/berita/_status.json.
// Tidak commit: periksa hasilnya, lalu commit tiga jalur itu saja (jangan git add -A).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIR_BERITA, DIR_GAMBAR } from './lib/konfigurasi.mjs';
import { LEMBAGA, ambilIsi } from './lib/sumber-lembaga.mjs';
import { unduhFotoRilis, kreditFotoRilis } from './lib/foto-rilis.mjs';
import { jadikanSampul } from './lib/gambar.mjs';
import { bacaStatus, simpanStatus } from './lib/status.mjs';

const slugs = process.argv.slice(2).filter((s) => !s.startsWith('--'));
if (!slugs.length) {
  console.error('Pakai: node otomasi/ganti-foto-rilis.mjs <slug> [<slug> ...]');
  process.exit(2);
}
const hostInduk = (u) => new URL(u).hostname.replace(/^www\./, '');
const st = bacaStatus();
let gagal = 0;
for (const slug of slugs) {
  const nama = readdirSync(DIR_BERITA).find((f) => f.endsWith(`-${slug}.json`));
  if (!nama) { console.log(`${slug}: berkas JSON tidak ada`); gagal++; continue; }
  const jalur = join(DIR_BERITA, nama);
  const a = JSON.parse(readFileSync(jalur, 'utf8'));
  const url = a.sumber?.[0]?.url;
  const sumber = url && LEMBAGA.find((s) => [s.daftar, s.asal].filter(Boolean).some((x) => hostInduk(x) === hostInduk(url)));
  if (a.jenis !== 'berita' || !sumber) { console.log(`${slug}: bukan berita siaran pers lembaga, dilewati`); gagal++; continue; }
  const k = { asal: 'lembaga', url, sumber, sumberNama: sumber.nama };
  const h = await ambilIsi(k);
  if (!h.ok) { console.log(`${slug}: halaman sumber tidak terbaca (${h.alasan})`); gagal++; continue; }
  if (!k.fotoUrl) { console.log(`${slug}: halaman sumber tidak punya foto rilis yang layak, sampul tetap`); continue; }
  // Sidik sampul lama milik artikel ini sendiri tidak dihitung sebagai "sudah dipakai".
  const riwayat = Object.fromEntries(Object.entries(st.gambar || {}).filter(([, v]) => v.slug !== slug));
  try {
    const f = await unduhFotoRilis(k.fotoUrl, { riwayat, jadikanSampul });
    writeFileSync(join(DIR_GAMBAR, `${slug}.webp`), f.webp);
    const kredit = kreditFotoRilis(k);
    a.foto = kredit;
    a.imgAlt = `Foto dokumentasi ${kredit.replace(/^Dok\. /, '')}: ${a.title}`.slice(0, 200);
    a.ilustrasi = 'foto-rilis';
    a.fotoSumber = k.fotoUrl;
    writeFileSync(jalur, `${JSON.stringify(a, null, 2)}\n`, 'utf8');
    st.gambar = st.gambar || {};
    st.gambar[f.sidik] = { t: a.date, slug };
    console.log(`${slug}: FOTO ${f.lebar}x${f.tinggi} (${kredit}) ${k.fotoUrl}`);
  } catch (e) {
    console.log(`${slug}: foto rilis ditolak (${e.message}), sampul tetap`);
  }
}
simpanStatus(st);
process.exitCode = gagal ? 1 : 0;
