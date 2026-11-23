// Uji ekstraksi teks bahan: polos (tag sebaris), cadangan paragraf (butir daftar, navigasi), perapian butir.
// Kasusnya dari uji kering evergreen 23 Nov 2026: laman QRIS BI ("5 7 juta"), laman pendaftaran
// BPJS Ketenagakerjaan (kanal dan dokumen hilang), dan laman DJKI (menu dan kaki laman).
import test from 'node:test';
import assert from 'node:assert/strict';
import { polos } from '../lib/alat.mjs';
import { isiDariParagraf, rapikan } from '../lib/ekstrak.mjs';

test('polos: tag sebaris tidak memisahkan kata, kecuali angka bertemu huruf atau huruf kecil bertemu kapital', () => {
  assert.equal(polos('sebanyak <strong><span>5</span></strong><strong><span>7 juta</span></strong>.'), 'sebanyak 57 juta.');
  assert.equal(polos('<span class="dropcap">S</span>ebelum mendaftar'), 'Sebelum mendaftar');
  assert.equal(polos('<span class="D">D</span>ata Pengguna QRIS'), 'Data Pengguna QRIS');
  assert.equal(polos('<span class="badge">1</span><span>Terdaftar</span>'), '1 Terdaftar');
  assert.equal(polos('<a href="/">Beranda</a><a href="/berita">Berita</a>'), 'Beranda Berita');
  assert.equal(polos('(<i>lihat</i>) di sini.'), '(lihat) di sini.');
  assert.equal(polos('surat berharga (<em>Debt Securities</em>), tagihan'), 'surat berharga (Debt Securities), tagihan');
  assert.equal(polos('<b>Catatan:</b> isi'), 'Catatan: isi');
  assert.equal(polos('5&nbsp;<b>7</b> hari'), '5 7 hari');
  // Tag blok dan sel tabel tetap memisahkan.
  assert.equal(polos('<td>a</td><td>b</td>'), 'a b');
  assert.equal(polos('<p>satu</p><p>dua</p>'), 'satu\ndua');
});

const KALIMAT = 'Pemberi kerja dapat mendaftar melalui kanal fisik maupun kanal non fisik yang tersedia.';
const KALIMAT2 = 'Pekerja migran dapat mendaftar melalui kanal layanan yang disediakan, sesuai ketentuan.';
// Atribut panjang supaya celah mentah antarparagraf melewati 3000 karakter seperti di laman BPJS.
const PANJANG = 'x'.repeat(250);
const butir = (t) => `<li class="${PANJANG}"><span class="${PANJANG}">${t}</span></li>`;

test('cadangan paragraf: butir daftar di antara paragraf ikut, daftar panjang tidak memutus gugus', () => {
  const html = [
    '<ul class="menu"><li>Beranda</li><li>Layanan</li></ul>',
    `<p>${KALIMAT}</p>`,
    '<p>Dengan membawa dokumen pendukung sebagai berikut:</p>',
    `<ol>${['Fotokopi KTP', 'Fotokopi NPWP', 'Kantor Cabang BPJS Ketenagakerjaan', 'Kantor Cabang BPJS Ketenagakerjaan', 'Formulir pendaftaran', 'Surat keterangan domisili', 'Akta pendirian', 'Izin usaha'].map(butir).join('')}</ol>`,
    '<p>Peserta Bukan Penerima Upah dapat mendaftar di tempat berikut, sesuai kebutuhan masing-masing.</p>',
    `<ul>${butir('Kantor Cabang BPJS Ketenagakerjaan')}</ul>`,
    `<p>${KALIMAT2}</p>`,
    '<ul><li>Tautan terkait</li></ul>',
  ].join('\n');
  assert.equal(isiDariParagraf(html), [
    KALIMAT,
    'Dengan membawa dokumen pendukung sebagai berikut:',
    '• Fotokopi KTP',
    '• Fotokopi NPWP',
    '• Kantor Cabang BPJS Ketenagakerjaan', // kembar berurutan dibuang satu
    '• Formulir pendaftaran',
    '• Surat keterangan domisili',
    '• Akta pendirian',
    '• Izin usaha',
    'Peserta Bukan Penerima Upah dapat mendaftar di tempat berikut, sesuai kebutuhan masing-masing.',
    '• Kantor Cabang BPJS Ketenagakerjaan', // butir sama di daftar lain tetap ada
    KALIMAT2,
  ].join('\n'));
});

test('cadangan paragraf: deretan tautan (kaki laman) tidak diambil dan tidak menjembatani ke baris hak cipta', () => {
  const tautan = Array.from({ length: 30 }, (_, i) => `<li class="${PANJANG}"><a href="/t${i}">Tautan ${i + 1}</a></li>`).join('');
  const html = [
    `<p>${KALIMAT}</p>`,
    `<p>${KALIMAT2}</p>`,
    `<ul>${tautan}</ul>`,
    '<p>Hak cipta (c) 2026 Lembaga Contoh. Seluruh hak dilindungi undang-undang.</p>',
  ].join('\n');
  assert.equal(isiDariParagraf(html), `${KALIMAT}\n${KALIMAT2}`);
});

test('cadangan paragraf: butir di dalam <p> yang tak ditutup tidak dicetak dua kali', () => {
  // Remah roti DJKI: "<p></li>" membuka paragraf yang baru tertutup jauh di bawah.
  const html = `<ul class="remah"><li>Beranda <p></li><li>Merek</li></ul><div>${KALIMAT}</div>`
    + '<table><tr><td>Biaya permohonan, per kelas.</td></tr></table></p>';
  assert.equal(isiDariParagraf(html), `Merek ${KALIMAT} Biaya permohonan, per kelas.`);
});

test('rapikan: butir daftar yang memuat alamat situs tetap ada, daftar kontak tetap dibuang', () => {
  const hasil = rapikan([
    'Pemberi kerja dapat mendaftar melalui kanal non fisik, yaitu:',
    '• a Aplikasi SIPP Online',
    '• b Portal Bersama melalui www.bpjs.go.id',
    '• Website: www.contoh.go.id Email: humas@contoh.go.id',
    'Website: www.contoh.go.id Email: humas@contoh.go.id',
    'Pendaftaran selesai setelah sertifikat kepesertaan terbit.',
  ].join('\n')).split('\n');
  assert.ok(hasil.includes('• b Portal Bersama melalui www.bpjs.go.id'), hasil.join(' | '));
  assert.ok(!hasil.some((b) => /Website/.test(b)), hasil.join(' | '));
});
