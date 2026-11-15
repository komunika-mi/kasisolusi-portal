// Uji foto rilis tanpa jaringan: pemilihan foto dari HTML sintetis (jebakan yang terbukti di The
// Signal) dan gerbang unduhan dengan fetch tiruan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cariFotoUtama, unduhFotoRilis, kreditFotoRilis } from '../lib/foto-rilis.mjs';
import { jadikanSampul } from '../lib/gambar.mjs';

const P = '<p>Paragraf isi siaran pers ini cukup panjang untuk dihitung sebagai bagian dari isi artikel utama.</p>';
const halaman = ({ og = '', badan = '' }) => `<html><head>${og ? `<meta property="og:image" content="${og}">` : ''}</head><body>${badan}</body></html>`;
const ASAL = 'https://www.kemendag.go.id/berita/siaran-pers/sinergi-program-pilihan-busan-kemendag-boyong-20-produk';

test('og:image satu domain induk dipakai', () => {
  const u = cariFotoUtama(halaman({ og: 'https://cdn.kemendag.go.id/storage/foto/acara.jpg', badan: P }), { asal: ASAL });
  assert.equal(u, 'https://cdn.kemendag.go.id/storage/foto/acara.jpg');
});

test('og:image host contoh (picsum) ditolak, foto badan di /storage/ dipakai', () => {
  const html = halaman({ og: 'https://picsum.photos/1200/630', badan: `${P}<img src="/storage/rilis/foto-1.jpg">${P}` });
  assert.equal(cariFotoUtama(html, { asal: ASAL }), 'https://www.kemendag.go.id/storage/rilis/foto-1.jpg');
});

test('og:image bukan URL ("image/jpeg") dan og perabot (about.png) gugur', () => {
  const a = halaman({ og: 'image/jpeg', badan: `${P}<img src="https://www.kemendag.go.id/wp-content/uploads/2026/11/acara.jpg">${P}` });
  assert.equal(cariFotoUtama(a, { asal: ASAL }), 'https://www.kemendag.go.id/wp-content/uploads/2026/11/acara.jpg');
  const b = halaman({ og: 'https://www.kemendag.go.id/assets/imgs/part/about.png', badan: P });
  assert.equal(cariFotoUtama(b, { asal: ASAL }), '');
});

test('og:image domain lain ditolak', () => {
  const html = halaman({ og: 'https://images.contohmedia.com/foto.jpg', badan: P });
  assert.equal(cariFotoUtama(html, { asal: ASAL }), '');
});

test('logo dan perabot di badan dilewati, foto rilis di dalam paragraf didahulukan', () => {
  const html = halaman({
    badan: `<img src="/assets/img/logo-danantara.png"><img src="/wp-content/uploads/2026/09/Mutu-International-Logo-1-1024x745.jpeg">${P}<img src="/wp-content/uploads/2026/11/WhatsApp-Image-2026-11-15-at-10.15.30.jpeg">${P}<img src="/wp-content/uploads/2026/01/mitra.jpg">`,
  });
  assert.equal(cariFotoUtama(html, { asal: ASAL }), 'https://www.kemendag.go.id/wp-content/uploads/2026/11/WhatsApp-Image-2026-11-15-at-10.15.30.jpeg');
});

test('turunan kecil Drupal /styles/<gaya>/public/ diganti berkas aslinya', () => {
  const html = halaman({ badan: `${P}<img src="https://pajak.go.id/sites/default/files/styles/kecil/public/2026-11/foto.jpg">${P}` });
  assert.equal(cariFotoUtama(html, { asal: 'https://pajak.go.id/id/siaran-pers/sanksi-pajak' }), 'https://pajak.go.id/sites/default/files/2026-11/foto.jpg');
});

test('tingkat 2: nama gambar dekat dengan slug sumber dipakai, gambar acak tidak', () => {
  const asal = 'https://ekraf.go.id/news/50-pelaku-ekraf-mataram-siap-bersaing-lewat-literasi-keuangan';
  const cocok = halaman({ badan: `${P}<img src="/gambar/mataram-literasi-01.jpg">${P}` });
  assert.equal(cariFotoUtama(cocok, { asal }), 'https://ekraf.go.id/gambar/mataram-literasi-01.jpg');
  const acak = halaman({ badan: `${P}<img src="/gambar/ilustrasi-umum.jpg">${P}` });
  assert.equal(cariFotoUtama(acak, { asal }), '');
});

test('svg, data:, dan halaman tanpa gambar menghasilkan kosong', () => {
  assert.equal(cariFotoUtama(halaman({ badan: `${P}<img src="/uploads/ikon.svg"><img src="data:image/gif;base64,AAAA">${P}` }), { asal: ASAL }), '');
  assert.equal(cariFotoUtama(halaman({ badan: P }), { asal: ASAL }), '');
});

test('kredit memakai nama singkat lembaga', () => {
  assert.equal(kreditFotoRilis({ sumber: { singkat: ['Kemendag', 'Kementerian Perdagangan'] }, sumberNama: 'Kementerian Perdagangan' }), 'Dok. Kemendag');
  assert.equal(kreditFotoRilis({ sumberNama: 'Bank Indonesia' }), 'Dok. Bank Indonesia');
});

function pasangFetch(buf, tipe = 'image/jpeg') {
  const asli = globalThis.fetch;
  globalThis.fetch = async () => new Response(buf, { status: 200, headers: { 'content-type': tipe } });
  return () => { globalThis.fetch = asli; };
}

async function jpeg(w, h) {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: w, height: h, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 50 } } }).jpeg({ quality: 85 }).toBuffer();
}

test('unduhan: foto mendatar cukup besar jadi sampul WebP 1280x720', async () => {
  const sharp = (await import('sharp')).default;
  const pulihkan = pasangFetch(await jpeg(1600, 1000));
  try {
    const f = await unduhFotoRilis('https://www.kemendag.go.id/storage/a.jpg', { riwayat: {}, jadikanSampul });
    const meta = await sharp(f.webp).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ['webp', 1280, 720]);
    assert.match(f.sidik, /^[0-9a-f]{64}$/);
  } finally { pulihkan(); }
});

test('unduhan: foto kecil, foto tegak, dan foto yang sudah dipakai ditolak', async () => {
  let pulihkan = pasangFetch(await jpeg(640, 400));
  try {
    await assert.rejects(unduhFotoRilis('https://x.go.id/storage/k.jpg', { jadikanSampul }), /terlalu kecil/);
  } finally { pulihkan(); }
  pulihkan = pasangFetch(await jpeg(1000, 1400));
  try {
    await assert.rejects(unduhFotoRilis('https://x.go.id/storage/t.jpg', { jadikanSampul }), /tegak/);
  } finally { pulihkan(); }
  const buf = await jpeg(1600, 1000);
  const { createHash } = await import('node:crypto');
  const sidik = createHash('sha256').update(buf).digest('hex');
  pulihkan = pasangFetch(buf);
  try {
    await assert.rejects(unduhFotoRilis('https://x.go.id/storage/d.jpg', { riwayat: { [sidik]: { slug: 'lama' } }, jadikanSampul }), /sudah dipakai artikel lama/);
  } finally { pulihkan(); }
});

test('og:image di bucket awan milik lembaga diterima, bucket milik pihak lain ditolak', () => {
  const asal = 'https://ekraf.go.id/news/50-pelaku-ekraf-mataram-siap-bersaing-lewat-literasi-keuangan';
  const milik = halaman({ og: 'https://storage.googleapis.com/ekraf-web-prd-bucket-01/landing_page/post_thumbnail_seo/01M7.webp', badan: P });
  assert.equal(cariFotoUtama(milik, { asal }), 'https://storage.googleapis.com/ekraf-web-prd-bucket-01/landing_page/post_thumbnail_seo/01M7.webp');
  const lain = halaman({ og: 'https://storage.googleapis.com/stok-foto-acak/foto.jpg', badan: P });
  assert.equal(cariFotoUtama(lain, { asal }), '');
});

test('og:image BI: http jadi https, turunan web SharePoint jadi berkas aslinya', () => {
  const asal = 'https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2825026.aspx';
  const html = halaman({ og: 'http://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/PublishingImages/_w/sp_2825026_1_png.jpg', badan: P });
  assert.equal(cariFotoUtama(html, { asal }), 'https://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/PublishingImages/sp_2825026_1.png');
});
