// Uji penjaga dengan contoh baik dan buruk: angka karangan, superlatif tanpa dasar, tanda pisah,
// "Prabowo" telanjang, kata tidak baku, kutipan karangan, salinan, judul. Jalankan: npm test (di otomasi/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { periksaArtikel, perbaikiOtomatis, perbaikiPrabowo, amankanIlustrasi } from '../lib/penjaga.mjs';
import { BAHAN, KONTEKS, artikelBaik, ubah } from './contoh.mjs';

const periksa = (a, k = KONTEKS) => periksaArtikel(perbaikiOtomatis(a).artikel, k);
const ada = (masalah, potongan) => masalah.some((m) => m.includes(potongan));

test('artikel baik lolos semua penjaga', () => {
  const m = periksa(artikelBaik());
  assert.deepEqual(m, []);
});

test('angka karangan ditolak, termasuk Rp2 miliar walau angka 2 ada di bahan', () => {
  // Bahan memuat "2 tahun" dan Rp2.000.000.000; "Rp12 miliar" tidak ada.
  const a = ubah((x) => { x.body[1].text += ' Bank penyalur juga menyiapkan Rp12 miliar untuk pelatihan.'; });
  const m = periksa(a);
  assert.ok(ada(m, 'angka tidak ada di bahan'), m.join('\n'));
  assert.ok(ada(m, 'Rp12 miliar'));
});

test('Rp2 miliar lolos kalau bahan menulisnya Rp2.000.000.000 (bentuk berbeda, nilai sama)', () => {
  const a = ubah((x) => { x.body[4].text += ' Denda bagi bank penyalur yang melanggar paling banyak Rp2 miliar.'; });
  assert.deepEqual(periksa(a), []);
});

test('angka 2 di bahan TIDAK meloloskan Rp2 miliar kalau bahan tidak memuat 2 miliar', () => {
  const k = { ...KONTEKS, bahan: BAHAN.replace('Rp2.000.000.000', 'Rp500 juta') };
  const a = ubah((x) => { x.body[4].text += ' Denda paling banyak Rp2 miliar.'; });
  const m = periksa(a, k);
  assert.ok(ada(m, '"Rp2 miliar"'), m.join('\n'));
});

test('nomor aturan dicocokkan berpasangan: Nomor 8 Tahun 2026 ditolak walau 8 dan 2026 ada', () => {
  const a = ubah((x) => { x.body[4].text = x.body[4].text.replace('Nomor 7 Tahun 2026', 'Nomor 8 Tahun 2026'); });
  const m = periksa(a);
  assert.ok(ada(m, 'Nomor 8 Tahun 2026'), m.join('\n'));
});

test('persen dan tanggal boleh beda bentuk: 65,9% dan (21/10/2026)', () => {
  const a = ubah((x) => { x.takeaways[2] = 'Sektor produksi menyerap 65,9%, di atas kewajiban 65 persen.'; x.body[0].text += ' Data itu dicatat per (21/10/2026).'; });
  assert.deepEqual(periksa(a), []);
});

test('jumlah butir buatan sendiri di judul ditolak ("Lima" tidak ada di bahan)', () => {
  const a = ubah((x) => { x.title = 'Lima Hal soal Penyaluran KUR Rp260,8 Triliun'; });
  assert.ok(ada(periksa(a), 'bilangan di judul/dek'));
});

test('superlatif tanpa dasar ditolak; yang tertulis di bahan lolos; kata ter- lain tidak tersaring', () => {
  const salah = ubah((x) => { x.body[1].text += ' Mayoritas debitur berasal dari sektor perdagangan.'; });
  assert.ok(ada(periksa(salah), 'superlatif'));
  const benar = ubah((x) => { x.body[4].text += ' Capaian itu disebut yang terbesar sepanjang program berjalan.'; });
  assert.deepEqual(periksa(benar), []);
  const bukan = ubah((x) => { x.body[4].text += ' Informasi terbaru terutama terkait syarat pengajuan.'; });
  assert.deepEqual(periksa(bukan), []);
});

test('jumlah samar karangan ditolak ("ribuan" tidak ada di bahan)', () => {
  const a = ubah((x) => { x.body[1].text += ' Ribuan pelaku usaha sudah mengantre di bank.'; });
  assert.ok(ada(periksa(a), 'jumlah samar'));
});

test('tanda pisah panjang: diperbaiki otomatis, dan yang lolos tanpa perbaikan ditolak', () => {
  const a = ubah((x) => { x.body[1].text = x.body[1].text.replace('Penyaluran disebut', 'Penyaluran — kata kementerian — disebut'); x.title = 'Penyaluran KUR Tembus Rp260,8 Triliun – Siapa Saja yang Dapat?'; });
  const { artikel, catatan } = perbaikiOtomatis(a);
  assert.ok(catatan.some((c) => c.includes('tanda pisah')));
  assert.ok(!/[—–]/.test(JSON.stringify(artikel)));
  assert.deepEqual(periksaArtikel(artikel, KONTEKS), []);
  // Tanpa perbaikan otomatis, penjaga sendiri menolak.
  assert.ok(ada(periksaArtikel(a, KONTEKS), 'tanda pisah'));
  // Rentang angka menjadi tanda hubung biasa.
  assert.equal(perbaikiOtomatis({ title: 'Target 2025–2026' }).artikel.title, 'Target 2025-2026');
});

test('"Prabowo" telanjang menjadi "Presiden Prabowo"; kutipan dan yang sudah bergelar tidak disentuh', () => {
  assert.equal(perbaikiPrabowo('Prabowo meminta bank mempercepat KUR.'), 'Presiden Prabowo meminta bank mempercepat KUR.');
  assert.equal(perbaikiPrabowo('Pak Prabowo hadir.'), 'Presiden Prabowo hadir.');
  assert.equal(perbaikiPrabowo('Prabowo Subianto meresmikan program.'), 'Presiden Prabowo Subianto meresmikan program.');
  assert.equal(perbaikiPrabowo('Presiden Prabowo meresmikan program.'), 'Presiden Prabowo meresmikan program.');
  assert.equal(perbaikiPrabowo('Ia berkata, "Pak Prabowo minta ini cepat."'), 'Ia berkata, "Pak Prabowo minta ini cepat."');
  assert.equal(perbaikiPrabowo('Kata Budi, “Prabowo sudah setuju.”'), 'Kata Budi, “Prabowo sudah setuju.”');
  const a = ubah((x) => { x.body[1].text += ' Prabowo disebut memantau program ini.'; });
  assert.ok(ada(periksaArtikel(a, KONTEKS), 'Presiden Prabowo'), 'tanpa perbaikan otomatis harus ditolak');
});

test('kata tidak baku ditolak di luar kutipan, dibiarkan di dalam kutipan', () => {
  const a = ubah((x) => { x.body[1].text += ' Debitur nggak perlu nunggu lama.'; });
  const m = periksa(a);
  assert.ok(ada(m, 'kata tidak baku'));
  assert.ok(ada(m, '"nggak"') && ada(m, '"nunggu"'));
  const cumaCuma = ubah((x) => { x.body[1].text += ' Pendampingan diberikan secara cuma-cuma.'; });
  assert.deepEqual(periksa(cumaCuma), []);
  const dalamKutipan = ubah((x) => { x.body[1].text += ' “Nggak usah takut,” kata petugas bank.'; });
  assert.deepEqual(periksa(dalamKutipan), []);
});

test('kutipan yang tidak ada persis di bahan ditolak', () => {
  const a = ubah((x) => { x.body[2].text = 'Kami akan menambah kuota KUR tahun depan untuk semua pelaku usaha.'; });
  assert.ok(ada(periksa(a), 'kutipan tidak ditemukan'));
  const sisip = ubah((x) => { x.body[1].text += ' "Bank harus lebih cepat melayani debitur kecil," katanya.'; });
  assert.ok(ada(periksa(sisip), 'tanda kutip tidak ada persis'));
});

test('menyalin kalimat bahan ditolak', () => {
  const salin = BAHAN.split('\n').slice(6, 8).join(' ').replace(/"/g, '');
  const a = ubah((x) => { x.body[6].text = `${salin} ${x.body[6].text}`; });
  assert.ok(ada(periksa(a), 'terlalu mirip'));
});

test('aturan judul: tanda seru, huruf kapital semua, terlalu panjang, sensasional', () => {
  assert.ok(ada(periksa(ubah((x) => { x.title = 'Penyaluran KUR Tembus Rp260,8 Triliun, Cek Sekarang!'; })), 'tanda seru'));
  assert.ok(ada(periksa(ubah((x) => { x.title = 'PENYALURAN KUR TEMBUS RP260,8 TRILIUN HINGGA OKTOBER'; })), 'kapital'));
  assert.ok(ada(periksa(ubah((x) => { x.title = 'Penyaluran KUR Tembus Rp260,8 Triliun dan Sudah Menjangkau 4 Juta Debitur di Seluruh Indonesia'; })), 'karakter; harus'));
  assert.ok(ada(periksa(ubah((x) => { x.title = 'Heboh, Penyaluran KUR Tembus Rp260,8 Triliun'; })), 'sensasional'));
});

test('judul yang tidak menyebut pokok soal ditolak (menyembunyikan inti)', () => {
  assert.ok(ada(periksa(ubah((x) => { x.title = 'Kabar Gembira untuk Anda yang Sedang Mencari Jalan Keluar'; })), 'inti berita'));
});

test('struktur berita: wajib ada bagian praktis di akhir dan panjang 300-800 kata', () => {
  const tanpaPenutup = ubah((x) => { x.body[5].text = 'Data lain dari kementerian'; });
  assert.ok(ada(periksa(tanpaPenutup), 'bagian praktis'));
  const pendek = ubah((x) => { x.body = x.body.slice(0, 4).concat([{ type: 'h2', text: 'Apa artinya bagi pelaku usaha' }, { type: 'p', text: 'Pantau kanal resmi.' }]); });
  assert.ok(ada(periksa(pendek), 'kata; harus'));
});

test('judul kembar dengan artikel yang sudah terbit ditolak', () => {
  const k = { ...KONTEKS, judulTerbaru: ['Penyaluran KUR Tembus Rp260,8 Triliun, Jangkau 4 Juta Debitur'] };
  assert.ok(ada(periksa(ubah((x) => { x.title = 'Penyaluran KUR Tembus Rp260,8 Triliun, Jangkau 4 Juta Debitur Baru'; }), k), 'terlalu mirip artikel'));
});

test('tanda < > dan tautan ditolak (mencegah HTML sisipan)', () => {
  assert.ok(ada(periksa(ubah((x) => { x.dek = 'Kementerian Contoh mencatat penyaluran KUR <script>x</script> menjangkau 4 juta debitur.'; })), 'tanda < atau >'));
  assert.ok(ada(periksa(ubah((x) => { x.body[1].text += ' Info: https://contoh.go.id'; })), 'tautan'));
});

test('objek ilustrasi yang bertulisan atau berorang diganti cadangan aman', () => {
  assert.equal(amankanIlustrasi('a smiling woman holding banknotes', 'keuangan').diganti, true);
  assert.equal(amankanIlustrasi('a signboard of a small shop', 'bisnis').diganti, true);
  assert.equal(amankanIlustrasi('a wooden market stall with baskets of red chili', 'bisnis').diganti, false);
});
