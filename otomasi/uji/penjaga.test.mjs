// Uji penjaga dengan contoh baik dan buruk: angka karangan, superlatif tanpa dasar, tanda pisah,
// "Prabowo" telanjang, kata tidak baku, kutipan karangan, salinan, judul. Jalankan: npm test (di otomasi/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { periksaArtikel, perbaikiOtomatis, perbaikiPrabowo, amankanIlustrasi } from '../lib/penjaga.mjs';
import { BAHAN, KONTEKS, artikelBaik, ubah, BAHAN_PANDUAN, KONTEKS_PANDUAN, artikelEvergreen, ubahEvergreen } from './contoh.mjs';

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

test('blok kutipan dirapikan: tanda kutip pembungkus dibuang, koma penutup jadi titik, isi tetap', async () => {
  const { rapikanKutipan } = await import('../lib/penjaga.mjs');
  assert.equal(rapikanKutipan('Hal ini membuka peluang bagi UMKM agar naik kelas,'), 'Hal ini membuka peluang bagi UMKM agar naik kelas.');
  assert.equal(rapikanKutipan('"Kami siap menyambut program ini,"'), 'Kami siap menyambut program ini.');
  assert.equal(rapikanKutipan('"Upaya ini perlu diperkuat," ujar Teuku Riefky.'), '"Upaya ini perlu diperkuat," ujar Teuku Riefky.');
  assert.equal(rapikanKutipan('Apakah ini sudah siap?'), 'Apakah ini sudah siap?');
  const a = perbaikiOtomatis({ title: 'x', dek: 'x', takeaways: [], body: [{ type: 'quote', text: 'Kami mengapresiasi dukungan itu,' }] }).artikel;
  assert.equal(a.body[0].text, 'Kami mengapresiasi dukungan itu.');
});

// ------------------------------------------------------------------ evergreen (23 Nov 2026)

test('evergreen baik lolos: "3 Syarat" cocok dengan 3 subjudul bernomor walau angka 3 tidak ada di bahan', () => {
  assert.ok(!/\b3\b/.test(BAHAN_PANDUAN), 'bahan sengaja tanpa angka 3');
  assert.deepEqual(periksa(artikelEvergreen(), KONTEKS_PANDUAN), []);
  // Ditulis dengan kata juga lolos, begitu pula judul tanpa angka.
  assert.deepEqual(periksa(ubahEvergreen((x) => { x.title = 'Tiga Syarat Mengajukan KUR Mikro yang Perlu Disiapkan'; }), KONTEKS_PANDUAN), []);
  assert.deepEqual(periksa(ubahEvergreen((x) => { x.title = 'Mau Mengajukan KUR Mikro? Siapkan Syarat Ini Dulu'; }), KONTEKS_PANDUAN), []);
});

test('evergreen: jumlah di judul harus sama dengan jumlah subjudul bernomor', () => {
  const m = periksa(ubahEvergreen((x) => { x.title = '5 Syarat Mengajukan KUR Mikro yang Perlu Disiapkan'; }), KONTEKS_PANDUAN);
  assert.ok(ada(m, 'judul menjanjikan 5 butir, tetapi body punya 3'), m.join('\n'));
  const nya = periksa(ubahEvergreen((x) => { x.title = 'Mau Mengajukan KUR Mikro? Ini 4 Syaratnya'; }), KONTEKS_PANDUAN);
  assert.ok(ada(nya, 'judul menjanjikan 4 butir'), nya.join('\n'));
  // Kata benda listicle di luar "syarat/cara/langkah" juga dihitung sebagai janji jumlah.
  assert.deepEqual(periksa(ubahEvergreen((x) => { x.title = '3 Trik Mengajukan KUR Mikro untuk Usaha Kecil'; }), KONTEKS_PANDUAN), []);
  const kiat = periksa(ubahEvergreen((x) => { x.title = 'Ini 5 Kiat Mengajukan KUR Mikro untuk Usaha Kecil'; }), KONTEKS_PANDUAN);
  assert.ok(ada(kiat, 'judul menjanjikan 5 butir, tetapi body punya 3'), kiat.join('\n'));
});

test('evergreen: nomor subjudul harus berurutan dari 1; "1)" diseragamkan menjadi "1."', () => {
  const lompat = periksa(ubahEvergreen((x) => { x.body[3].text = '3. Dokumen identitas dan izin usaha'; x.body[5].text = '4. Ajukan lewat bank penyalur'; }), KONTEKS_PANDUAN);
  assert.ok(ada(lompat, 'berurutan'), lompat.join('\n'));
  const kurung = ubahEvergreen((x) => { x.body[1].text = '1) Usaha sudah berjalan'; });
  assert.equal(perbaikiOtomatis(kurung).artikel.body[1].text, '1. Usaha sudah berjalan');
  assert.deepEqual(periksa(kurung, KONTEKS_PANDUAN), []);
});

test('evergreen: kata lebay dan gaya kabar baru ditolak', () => {
  const lebay = periksa(ubahEvergreen((x) => { x.title = 'Rahasia Lolos KUR Mikro, Ini 3 Syaratnya'; }), KONTEKS_PANDUAN);
  assert.ok(ada(lebay, 'kata "rahasia"'), lebay.join('\n'));
  assert.ok(ada(periksa(ubahEvergreen((x) => { x.title = '3 Syarat Terbaru Mengajukan KUR Mikro'; }), KONTEKS_PANDUAN), 'kata "terbaru"'));
  const kabar = periksa(ubahEvergreen((x) => { x.dek = 'Hari ini Kasisolusi merangkum syarat KUR mikro dari laman resmi Kementerian Contoh untuk pelaku usaha.'; }), KONTEKS_PANDUAN);
  assert.ok(ada(kabar, 'bukan kabar terbaru'), kabar.join('\n'));
  // "Pastikan" dan "instansi" bukan kata lebay.
  assert.deepEqual(periksa(ubahEvergreen((x) => { x.title = 'Pastikan 3 Syarat Ini Siap Sebelum Mengajukan KUR'; }), KONTEKS_PANDUAN), []);
});

test('evergreen dari laman resmi: penutup wajib menganjurkan cek ketentuan terbaru, tanpa nomor', () => {
  const tanpa = periksa(ubahEvergreen((x) => { x.body[8].text = 'Kumpulkan dokumen lebih dulu supaya pengajuan lancar dan tidak bolak-balik ke bank penyalur.'; }), KONTEKS_PANDUAN);
  assert.ok(ada(tanpa, 'menganjurkan pembaca mengecek ketentuan terbaru'), tanpa.join('\n'));
  const bernomor = periksa(ubahEvergreen((x) => { x.body[7].text = '4. Yang perlu disiapkan pelaku usaha'; x.title = '4 Syarat Mengajukan KUR Mikro yang Perlu Disiapkan'; }), KONTEKS_PANDUAN);
  assert.ok(ada(bernomor, 'subjudul terakhir harus bagian praktis tanpa nomor'), bernomor.join('\n'));
});

test('berita biasa tetap ketat: jumlah butir buatan di judul ditolak walau subjudulnya bernomor', () => {
  const m = periksa(ubahEvergreen((x) => { x.body[7].text = 'Apa artinya bagi pelaku usaha'; }), { ...KONTEKS_PANDUAN, jenis: 'berita' });
  assert.ok(ada(m, 'angka tidak ada di bahan') || ada(m, 'bilangan di judul'), m.join('\n'));
});
