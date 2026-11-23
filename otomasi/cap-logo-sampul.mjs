// Cap logo Kasisolusi ke sampul ilustrasi AI yang SUDAH TERBIT. Sampul baru sudah dicap sendiri
// oleh lib/gambar.mjs sejak 23 Nov 2026 (pojok kiri atas, hanya ilustrasi AI). Hanya artikel
// berlabel foto "Ilustrasi AI"; foto rilis lembaga ("Dok. ...") tidak disentuh. Aman diulang:
// sampul yang sudah membawa penanda cap dilewati.
//
//   node otomasi/cap-logo-sampul.mjs            # cap semua ilustrasi yang belum berlogo
//   node otomasi/cap-logo-sampul.mjs --kering   # hanya daftar, tidak menulis berkas
//
// Hanya mengubah public/assets/berita/<slug>.webp (build memberi ?v=<md5> baru, jadi cache peramban
// ikut berganti). Tidak commit: periksa hasilnya, lalu commit jalur itu saja (jangan git add -A).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIR_BERITA, DIR_GAMBAR } from './lib/konfigurasi.mjs';
import { capLogoSampul, sudahBerlogo } from './lib/gambar.mjs';

const KERING = process.argv.includes('--kering');
const hitung = { dicap: 0, sudah: 0, fotoRilis: 0, gagal: 0 };
for (const nama of readdirSync(DIR_BERITA).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
  const a = JSON.parse(readFileSync(join(DIR_BERITA, nama), 'utf8'));
  if (a.foto !== 'Ilustrasi AI') { hitung.fotoRilis++; continue; }
  const jalur = join(DIR_GAMBAR, `${a.slug}.webp`);
  if (!existsSync(jalur)) { console.log(`${a.slug}: sampul tidak ada`); hitung.gagal++; continue; }
  const buf = readFileSync(jalur);
  if (await sudahBerlogo(buf)) { hitung.sudah++; continue; }
  try {
    const baru = await capLogoSampul(buf);
    if (!KERING) writeFileSync(jalur, baru);
    hitung.dicap++;
    console.log(`${a.slug}: ${KERING ? 'akan dicap' : 'dicap'} (${Math.round(buf.length / 1024)} -> ${Math.round(baru.length / 1024)} KB)`);
  } catch (e) {
    hitung.gagal++;
    console.log(`${a.slug}: gagal (${e.message})`);
  }
}
console.log(`Selesai${KERING ? ' (kering)' : ''}: ${hitung.dicap} ${KERING ? 'akan dicap' : 'dicap'}, ${hitung.sudah} sudah berlogo, ${hitung.fotoRilis} bukan ilustrasi (dilewati), ${hitung.gagal} gagal.`);
process.exitCode = hitung.gagal ? 1 : 0;
