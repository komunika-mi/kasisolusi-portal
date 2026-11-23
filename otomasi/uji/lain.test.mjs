// Uji pendukung: angka, JSON tahan banting, laju kuota, robots.txt, bentuk artikel bersama build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ambilAngka, indeksSumber, angkaTakBersumber } from '../lib/angka.mjs';
import { uraiJson } from '../lib/penulis.mjs';
import { batasKumulatif, jatahPutaran } from '../lib/status.mjs';
import { uraiRobots, nilaiRobots, laranganAIDiHalaman } from '../lib/jaringan.mjs';
import { materiEpisode, narasumberDari, uraiFeedYoutube } from '../lib/sumber-youtube.mjs';
import { periksaBentuk } from '../../src/berita-otomatis.mjs';
import { KUOTA, PER_PUTARAN } from '../lib/konfigurasi.mjs';
import { bergiliran, PANDUAN, LEMBAGA_PANDUAN, kandidatKurasi } from '../lib/sumber-evergreen.mjs';
import { judulKembar } from '../lib/seleksi.mjs';
import { kunciUrl } from '../lib/alat.mjs';
import { rapikan } from '../lib/ekstrak.mjs';

test('angka: nilai beserta satuan, bukan deretan digit', () => {
  const idx = indeksSumber('Target Rp290 triliun, 89,93 persen, 4 juta debitur, PP Nomor 20 Tahun 2026, Kamis (22/10/2026), pukul 09.00 WIB.');
  assert.deepEqual(angkaTakBersumber('Rp 290 triliun, 89,93%, 4.000.000 debitur, PP 20/2026, 22 Oktober 2026, pukul 09.00', idx), []);
  assert.deepEqual(angkaTakBersumber('Rp29 triliun', idx), ['Rp29 triliun']);
  assert.deepEqual(angkaTakBersumber('89,9 persen', idx), ['89,9 persen']);
  assert.deepEqual(angkaTakBersumber('PP Nomor 21 Tahun 2026', idx), ['Nomor 21 Tahun 2026']);
  assert.deepEqual(angkaTakBersumber('pukul 10.00', idx), ['pukul 10.00']);
  assert.deepEqual(angkaTakBersumber('jaringan 5G', idx), ['5G']);
});

test('angka: bilangan berupa kata di sumber ikut terbaca', () => {
  const idx = indeksSumber('Denda paling banyak dua miliar rupiah untuk tiga pelanggaran.');
  assert.deepEqual(angkaTakBersumber('denda Rp2 miliar untuk 3 pelanggaran', idx), []);
});

test('angka: format ribuan dan desimal Indonesia', () => {
  const t = ambilAngka('17.637.774 NIB, 1,6 juta debitur, Rp4,8 miliar, 0,5 persen');
  assert.deepEqual(t.map((x) => [x.nilai, x.satuan]), [[17637774, 'polos'], [1600000, 'polos'], [4800000000, 'rp'], [0.5, 'persen']]);
});

test('uraiJson: pagar markdown, baris baru mentah di dalam string, koma sisa', () => {
  const mentah = '```json\n{"title": "Baris satu\nbaris dua", "takeaways": ["a", "b",], "body": [{"type": "p", "text": "x\ty"},],}\n```';
  const j = uraiJson(mentah);
  assert.equal(j.title, 'Baris satu\nbaris dua');
  assert.deepEqual(j.takeaways, ['a', 'b']);
  assert.equal(j.body[0].text, 'x\ty');
  assert.throws(() => uraiJson('maaf, saya tidak bisa'), /tanpa objek JSON/);
});

test('laju: batas kumulatif per jam dan jatah putaran', () => {
  assert.equal(batasKumulatif(12, 5), 0);
  assert.equal(batasKumulatif(12, 6), 1);
  assert.equal(batasKumulatif(12, 12), 6);
  assert.equal(batasKumulatif(12, 19), 12);
  assert.equal(batasKumulatif(3, 6), 1);
  assert.equal(batasKumulatif(3, 15), 3);
  assert.deepEqual(jatahPutaran({ terbit: { berita: 0, tips: 0 }, jam: 10 }).berita, 3);
  assert.equal(jatahPutaran({ terbit: { berita: 5, tips: 0 }, jam: 10 }).berita, 0);
  assert.equal(jatahPutaran({ terbit: { berita: 12, tips: 3 }, jam: 21, paksa: true }).berita, 0);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0 }, jam: 3 }).berita, 0);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0 }, jam: 3, paksa: true }).berita, 3);
  // Evergreen 3 per hari, 2 per putaran; laju per jam: 06=1, 10=2, 15=3.
  // Hitungan lama tanpa kolom evergreen dibaca sebagai nol.
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0 }, jam: 6 }).evergreen, 1);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0 }, jam: 10 }).evergreen, 2);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0 }, jam: 19 }).evergreen, 2);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0, evergreen: 1 }, jam: 9 }).evergreen, 0);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0, evergreen: 1 }, jam: 10 }).evergreen, 1);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0, evergreen: 2 }, jam: 14 }).evergreen, 0);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0, evergreen: 2 }, jam: 15 }).evergreen, 1);
  assert.equal(jatahPutaran({ terbit: { berita: 0, tips: 0, evergreen: 3 }, jam: 21, paksa: true }).evergreen, 0);
  assert.ok(jatahPutaran({ terbit: { berita: 12, tips: 3, evergreen: 3 }, jam: 12 }).alasan.some((x) => x.startsWith('evergreen: kuota harian 3')));
});

test('laju: dengan separuh jadwal hilang (rata-rata 8,5 putaran/hari), kuota harian tetap tercapai', () => {
  // Simulasi 3000 hari; tiap jam 06-22 WIB jalan dengan peluang 50%; kandidat selalu cukup.
  let acak = 12345;
  const rnd = () => ((acak = (acak * 1103515245 + 12345) % 2147483648) / 2147483648);
  const hasil = { berita: [], tips: [], evergreen: [] };
  for (let hari = 0; hari < 3000; hari++) {
    const terbit = { berita: 0, tips: 0, evergreen: 0 };
    for (let jam = 6; jam <= 22; jam++) {
      if (rnd() >= 0.5) continue;
      const j = jatahPutaran({ terbit, jam });
      terbit.berita += j.berita;
      terbit.tips += j.tips;
      terbit.evergreen += j.evergreen;
    }
    hasil.berita.push(terbit.berita);
    hasil.tips.push(terbit.tips);
    hasil.evergreen.push(terbit.evergreen);
  }
  const rata = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const penuh = (a, k) => a.filter((x) => x === k).length / a.length;
  assert.ok(Math.max(...hasil.berita) <= KUOTA.berita && Math.max(...hasil.tips) <= KUOTA.tips, 'tidak pernah melampaui kuota');
  assert.ok(rata(hasil.berita) >= 11.5, `rata-rata berita ${rata(hasil.berita)}`);
  assert.ok(penuh(hasil.berita, 12) >= 0.85, `hari berita penuh ${penuh(hasil.berita, 12)}`);
  assert.ok(rata(hasil.tips) >= 2.8, `rata-rata tips ${rata(hasil.tips)}`);
  assert.ok(Math.max(...hasil.evergreen) <= KUOTA.evergreen, 'evergreen tidak pernah melampaui kuota');
  assert.ok(rata(hasil.evergreen) >= 2.8, `rata-rata evergreen ${rata(hasil.evergreen)}`);
  console.log(`  simulasi: rata-rata ${rata(hasil.berita).toFixed(2)} berita (${(penuh(hasil.berita, 12) * 100).toFixed(0)}% hari penuh), ${rata(hasil.tips).toFixed(2)} tips, ${rata(hasil.evergreen).toFixed(2)} evergreen; per putaran maks ${PER_PUTARAN.berita}+${PER_PUTARAN.tips}+${PER_PUTARAN.evergreen}`);
});

test('laju: jadwal yang teramati 16-23 Nov 2026 (dua putaran di jendela) tetap memberi 3 evergreen', () => {
  // Jam WIB event schedule yang benar-benar jalan (gh run list); yang dini hari di luar jendela.
  const teramati = {
    '16 Nov': [9, 18], '17 Nov': [5, 12, 21], '18 Nov': [5, 11, 20], '19 Nov': [4, 11, 20],
    '20 Nov': [5, 10, 19], '21 Nov': [4, 10, 19], '22 Nov': [3, 10, 18],
  };
  for (const [hari, daftarJam] of Object.entries(teramati)) {
    const terbit = { berita: 0, tips: 0, evergreen: 0 };
    for (const jam of daftarJam) {
      const j = jatahPutaran({ terbit, jam });
      for (const jenis of Object.keys(terbit)) terbit[jenis] += j[jenis];
    }
    assert.equal(terbit.evergreen, KUOTA.evergreen, `${hari}: evergreen ${terbit.evergreen}`);
    // Bukan target, hanya dicatat: pada pola ini berita paling banyak 6 dan tips 2.
    assert.ok(terbit.berita <= 6 && terbit.tips <= 2, `${hari}: ${JSON.stringify(terbit)}`);
  }
});

test('rapikan: langkah bernomor yang memuat alamat situs tetap ada, baris kontak tetap dibuang', () => {
  // Panduan merek DJKI, 23 Nov 2026: langkah 1 dulu terbuang karena dianggap baris kontak.
  const hasil = rapikan([
    'Panduan:',
    '1) Login pada laman https://merek.dgip.go.id/',
    '2) Klik “Permohonan Online”',
    'a) Buka www.contoh.go.id',
    'Kunjungi www.kemenkopukm.go.id',
    'Website: www.contoh.go.id Email: humas@contoh.go.id',
    'Pemohon membayar biaya pada hari yang sama sesuai tarif yang berlaku.',
  ].join('\n')).split('\n');
  assert.ok(hasil.includes('1) Login pada laman https://merek.dgip.go.id/'), hasil.join(' | '));
  assert.ok(hasil.includes('a) Buka www.contoh.go.id'), hasil.join(' | '));
  assert.ok(!hasil.some((b) => /^(Kunjungi|Website)/.test(b)), hasil.join(' | '));
});

test('robots.txt: penolakan perayap AI, jalur terlarang, crawl-delay', () => {
  const republika = uraiRobots('User-Agent: *\nDisallow: /search/?q=\n\nUser-agent: GPTBot\nDisallow: /\n');
  assert.equal(nilaiRobots(republika, '/berita/abc').tolakAI, true);
  const ekraf = uraiRobots('User-agent: *\nAllow: /\nCrawl-delay: 10\n\nUser-agent: GPTBot\nCrawl-delay: 30\n');
  assert.deepEqual(nilaiRobots(ekraf, '/news/x'), { boleh: true, tolakAI: false, jedaDetik: 10 });
  const liputan6 = uraiRobots('User-agent: *\nDisallow: /search\nDisallow: /*?page=\nAllow: /indeks/*page=\n');
  assert.equal(nilaiRobots(liputan6, '/bisnis/read/1/judul').boleh, true);
  assert.equal(nilaiRobots(liputan6, '/search').boleh, false);
  assert.equal(nilaiRobots(liputan6, '/bisnis?page=2').boleh, false);
  const gnews = uraiRobots('User-agent: *\nDisallow: /\nAllow: /$\nAllow: /topics/\n');
  assert.equal(nilaiRobots(gnews, '/rss/search?q=UMKM').boleh, false);
  assert.equal(nilaiRobots(gnews, '/topics/abc').boleh, true);
  const detik = uraiRobots('User-agent: Google-Extended\nAllow: /\n\nUser-agent: *\nAllow: /\n');
  assert.equal(nilaiRobots(detik, '/berita/x').tolakAI, false);
});

test('larangan AI di halaman terdeteksi', () => {
  assert.ok(laranganAIDiHalaman('<p>Dilarang keras mengambil konten, melakukan crawling atau pengindeksan otomatis untuk AI di situs web ini tanpa izin tertulis.</p>'));
  assert.ok(laranganAIDiHalaman('<meta name="robots" content="noai, noimageai">'));
  assert.equal(laranganAIDiHalaman('<p>Berita biasa tentang UMKM.</p>'), '');
});

test('YouTube: materi episode tanpa promosi, narasumber, Shorts dikenali', () => {
  const desk = '🗣️: Coach James\n\nBanyak sales ditolak pelanggan.\nCara menghadapinya dibahas di sini.\n\nSimak selengkapnya di Podcast Kasisolusi\n\n-------\n\nJangan lupa subscribe!\nWhatsApp: 0817';
  assert.equal(materiEpisode(desk), '🗣️: Coach James\n\nBanyak sales ditolak pelanggan.\nCara menghadapinya dibahas di sini.');
  assert.equal(narasumberDari(materiEpisode(desk)), 'Coach James');
  const feed = uraiFeedYoutube('<entry><yt:videoId>abcdefghijk</yt:videoId><title>Judul &amp; Tips</title><link rel="alternate" href="https://www.youtube.com/shorts/abcdefghijk"/><published>2026-11-15T13:00:00+00:00</published><media:description></media:description><media:statistics views="12"/></entry>');
  assert.equal(feed[0].judul, 'Judul & Tips');
  assert.ok(feed[0].tautan.includes('/shorts/'));
});

test('bentuk artikel bersama build: href berbahaya, tag, dan img yang salah ditolak', () => {
  const baik = {
    slug: 'contoh-berita', title: 'Contoh Judul Berita yang Cukup Panjang', dek: 'Dek contoh yang cukup panjang untuk lolos.', kanal: 'bisnis',
    date: '2026-11-16', dibuat: '2026-11-16T09:00:00+07:00', jenis: 'berita', otomatis: true, kunci: 'https://contoh.go.id/a',
    img: '/assets/berita/contoh-berita.webp', imgAlt: 'Ilustrasi contoh', foto: 'Ilustrasi AI', takeaways: ['Poin satu yang cukup.'],
    body: [{ type: 'p', text: 'a' }, { type: 'h2', text: 'b' }, { type: 'p', text: 'c' }], sumber: [{ label: 'Contoh', url: 'https://contoh.go.id/a' }],
  };
  assert.deepEqual(periksaBentuk(baik), []);
  assert.ok(periksaBentuk({ ...baik, sumber: [{ label: 'x', url: 'javascript:alert(1)' }] }).length);
  assert.ok(periksaBentuk({ ...baik, title: 'Judul </script><script>alert(1)</script>' }).length);
  assert.ok(periksaBentuk({ ...baik, img: '/assets/berita/lain.webp' }).length);
  assert.ok(periksaBentuk({ ...baik, cta: { label: 'x', href: '/kelas' } }).length);
  assert.ok(periksaBentuk({ ...baik, video: { id: 'bukan id', title: 'x' } }).length);
  assert.ok(periksaBentuk({ ...baik, date: '2026-11-17' }).length, 'date harus sama dengan tanggal dibuat');
  assert.deepEqual(periksaBentuk({ ...baik, jenis: 'evergreen' }), [], 'evergreen jenis yang sah');
  assert.ok(periksaBentuk({ ...baik, jenis: 'panduan' }).length, 'jenis di luar daftar ditolak');
});

test('evergreen: kandidat panduan bergiliran per lembaga, urutan di dalam lembaga tetap', () => {
  const daftar = ['djp-1', 'djp-2', 'djp-3', 'bi-1', 'djki-1', 'djki-2'].map((id) => ({ id, lembaga: id.split('-')[0] }));
  assert.deepEqual(bergiliran(daftar, (x) => x.lembaga).map((x) => x.id), ['djp-1', 'bi-1', 'djki-1', 'djp-2', 'djki-2', 'djp-3']);
  assert.deepEqual(bergiliran([], (x) => x), []);
});

test('evergreen: daftar kurasi sah, alamatnya unik, dan judul kurasinya tidak saling kembar', () => {
  assert.ok(PANDUAN.length > 0);
  const kunci = new Set();
  for (const p of PANDUAN) {
    assert.ok(LEMBAGA_PANDUAN[p.lembaga], `lembaga tidak dikenal: ${p.lembaga}`);
    assert.match(p.url, /^https:\/\/[a-z0-9.-]+\.go\.id\//, p.url);
    assert.match(p.diperiksa, /^\d{4}-\d{2}-\d{2}$/, p.url);
    assert.ok(p.judul.length >= 15 && p.judul.length <= 80, `judul kurasi: ${p.judul}`);
    assert.ok(!kunci.has(kunciUrl(p.url)), `alamat ganda: ${p.url}`);
    kunci.add(kunciUrl(p.url));
  }
  // judulDiproses (jalan.mjs) memuat judul sumber yang sudah diproses: dua judul kurasi yang kembar
  // membuat laman kedua dicap "sudah dibahas" padahal isinya lain.
  for (let i = 0; i < PANDUAN.length; i++) {
    for (let j = i + 1; j < PANDUAN.length; j++) {
      assert.ok(!judulKembar(PANDUAN[i].judul, PANDUAN[j].judul), `kembar: "${PANDUAN[i].judul}" dan "${PANDUAN[j].judul}"`);
    }
  }
  const k = kandidatKurasi();
  assert.equal(k.length, PANDUAN.length);
  assert.ok(k.every((x) => x.kurasi && x.jenis === 'evergreen' && x.asal === 'lembaga' && x.judulKurasi === x.judul));
  assert.notEqual(k[0].sumberId, k[1].sumberId, 'dua kandidat pertama dari lembaga berbeda');
  assert.throws(() => kandidatKurasi([{ lembaga: 'tidak-ada', url: 'https://contoh.go.id/a', judul: 'Contoh judul kurasi' }]), /tidak ada di LEMBAGA_PANDUAN/);
});
