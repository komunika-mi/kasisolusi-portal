// Cap logo Kasisolusi di sampul ilustrasi AI (23 Nov 2026): pojok kiri atas, hanya ilustrasi,
// tidak pernah dobel (penanda EXIF), ukuran sampul tetap 1280x720.
import test from 'node:test';
import assert from 'node:assert/strict';
import { jadikanSampul, capLogoSampul, sudahBerlogo, CAP_LOGO } from '../lib/gambar.mjs';

const sharp = (await import('sharp')).default;
const polosan = (r, g, b) => sharp({ create: { width: 1536, height: 1024, channels: 3, background: { r, g, b } } }).png().toBuffer();

/** Rata-rata RGB piksel paling terang dan paling gelap di satu wilayah. */
async function wilayah(buf, left, top, width, height) {
  const { data, info } = await sharp(buf).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let terang = 0;
  let gelap = 765;
  for (let i = 0; i < data.length; i += info.channels) {
    const s = data[i] + data[i + 1] + data[i + 2];
    terang = Math.max(terang, s);
    gelap = Math.min(gelap, s);
  }
  return { terang: terang / 3, gelap: gelap / 3 };
}

test('logo:true mengecap kapsul navy berlogo putih di pojok kiri atas, bagian lain tetap', async () => {
  const mentah = await polosan(120, 140, 90);
  const polos = await jadikanSampul(mentah);
  const berlogo = await jadikanSampul(mentah, { logo: true });
  const t = CAP_LOGO.tepi;
  const kotakLogo = [t + CAP_LOGO.padX, t + CAP_LOGO.padY, CAP_LOGO.lebar, 38];
  const dicap = await wilayah(berlogo, ...kotakLogo);
  assert.ok(dicap.terang > 225, `huruf logo putih (terang ${dicap.terang})`);
  assert.ok(dicap.gelap < 70, `latar kapsul navy (gelap ${dicap.gelap})`);
  const asli = await wilayah(polos, ...kotakLogo);
  assert.ok(asli.terang < 160, 'tanpa cap, wilayah itu tetap warna latar');
  const kananAtas = await wilayah(berlogo, 1280 - t - 246, t, 246, 64);
  assert.ok(kananAtas.terang < 160 && kananAtas.gelap > 60, 'pojok kanan atas tidak dicap');
  const a = await wilayah(polos, 700, 400, 40, 40);
  const b = await wilayah(berlogo, 700, 400, 40, 40);
  assert.ok(Math.abs(a.terang - b.terang) <= 3 && Math.abs(a.gelap - b.gelap) <= 3, 'tengah gambar tidak berubah');
});

test('penanda cap: polos belum berlogo, hasil cap berlogo, ukuran tetap 1280x720', async () => {
  const polos = await jadikanSampul(await polosan(200, 210, 220));
  assert.equal(await sudahBerlogo(polos), false);
  const dicap = await capLogoSampul(polos);
  assert.equal(await sudahBerlogo(dicap), true);
  const m = await sharp(dicap).metadata();
  assert.deepEqual([m.format, m.width, m.height], ['webp', 1280, 720]);
  assert.ok(dicap.length <= 150 * 1024);
  assert.equal(await sudahBerlogo(await jadikanSampul(await polosan(10, 20, 30), { logo: true })), true);
});

test('capLogoSampul menolak gambar yang bukan sampul 1280x720', async () => {
  const kecil = await sharp({ create: { width: 640, height: 360, channels: 3, background: '#888888' } }).webp().toBuffer();
  await assert.rejects(capLogoSampul(kecil), /bukan 1280x720/);
});
