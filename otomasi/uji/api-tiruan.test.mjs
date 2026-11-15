// Uji jalur API tanpa kunci dan tanpa jaringan: fetch diganti tiruan untuk memeriksa bentuk
// permintaan ke OpenRouter dan OpenAI serta penanganan balasannya.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buatPenulisAsli } from '../lib/penulis.mjs';
import { buatPembuatGambar } from '../lib/gambar.mjs';
import { susunPesan } from '../lib/telegram.mjs';

const KANDIDAT = { jenis: 'berita', asal: 'lembaga', sumberNama: 'Kementerian Contoh', url: 'https://contoh.go.id/a', terbit: '2026-11-14T05:00:00.000Z', judul: 'Judul Sumber', isi: 'Isi bahan.' };

function pasangFetch(urutan) {
  const panggilan = [];
  const asli = globalThis.fetch;
  globalThis.fetch = async (url, opsi = {}) => {
    panggilan.push({ url: String(url), opsi, badan: opsi.body ? JSON.parse(opsi.body) : null });
    const b = urutan.shift();
    if (!b) throw new Error('fetch tiruan kehabisan balasan');
    const isi = Buffer.isBuffer(b.badan) || typeof b.badan === 'string' ? b.badan : JSON.stringify(b.badan);
    return new Response(isi, { status: b.status || 200, headers: { 'content-type': b.tipe || 'application/json' } });
  };
  return { panggilan, pulihkan: () => { globalThis.fetch = asli; } };
}

test('OpenRouter: bentuk permintaan sesuai dokumentasi, JSON berbaris baru mentah tetap terbaca', async () => {
  process.env.OPENROUTER_MODEL = '';
  const f = pasangFetch([{ badan: { model: 'deepseek/deepseek-v4.1-flash', choices: [{ finish_reason: 'stop', message: { content: '{"layak": true, "title": "Baris\nbaru"}' } }], usage: { cost: 0.0012 } } }]);
  try {
    const p = buatPenulisAsli('kunci-uji');
    const h = await p.tulis({ kandidat: KANDIDAT, judulTerbaru: ['Judul lama'] });
    const req = f.panggilan[0];
    assert.equal(req.url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(req.opsi.headers.Authorization, 'Bearer kunci-uji');
    assert.deepEqual(req.badan.models, ['deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3-flash', 'qwen/qwen3.8-flash']);
    assert.equal(req.badan.model, undefined, 'hanya `models` (daftar urut) yang dikirim');
    assert.equal(req.badan.response_format.type, 'json_schema');
    assert.equal(req.badan.response_format.json_schema.strict, true);
    assert.deepEqual(req.badan.provider, { require_parameters: true });
    assert.deepEqual(req.badan.plugins, [{ id: 'response-healing' }]);
    assert.deepEqual(req.badan.reasoning, { effort: 'low' }, 'berpikir dibatasi supaya tulisan tidak terpotong');
    assert.equal(req.badan.max_tokens, 16000);
    assert.equal(req.badan.messages[0].role, 'system');
    assert.ok(req.badan.messages[1].content.includes('Judul lama'));
    assert.equal(h.artikel.title, 'Baris\nbaru');
    assert.equal(h.model, 'deepseek/deepseek-v4.1-flash');
    assert.equal(h.biayaUsd, 0.0012);
  } finally { f.pulihkan(); }
});

test('OpenRouter: model pilihan pemilik di depan, cadangan bawaan tetap ada', async () => {
  process.env.OPENROUTER_MODEL = 'qwen/qwen3.8-flash';
  const f = pasangFetch([{ badan: { model: 'qwen/qwen3.8-flash', choices: [{ message: { content: '{"layak": false, "alasan": "x"}' } }] } }]);
  try {
    await buatPenulisAsli('k').tulis({ kandidat: KANDIDAT });
    assert.deepEqual(f.panggilan[0].badan.models, ['qwen/qwen3.8-flash', 'deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3-flash']);
  } finally { f.pulihkan(); process.env.OPENROUTER_MODEL = ''; }
});

test('OpenRouter: skema ditolak (400) turun ke json_object; JSON rusak diulang sekali', async () => {
  const f = pasangFetch([
    { status: 400, badan: { error: { message: 'response_format json_schema not supported' } } },
    { badan: { model: 'm', choices: [{ message: { content: 'maaf bukan json' } }] } },
    { badan: { model: 'm', choices: [{ message: { content: '{"layak": true}' } }] } },
  ]);
  try {
    const h = await buatPenulisAsli('k').tulis({ kandidat: KANDIDAT });
    assert.equal(f.panggilan[1].badan.response_format.type, 'json_object');
    assert.equal(h.artikel.layak, true);
    assert.equal(f.panggilan.length, 3);
  } finally { f.pulihkan(); }
});

test('OpenRouter: 401/402 menghasilkan galat yang menyebut kodenya (dipakai untuk menghentikan putaran)', async () => {
  const f = pasangFetch([{ status: 402, badan: { error: { message: 'Insufficient credits' } } }]);
  try {
    await assert.rejects(buatPenulisAsli('k').tulis({ kandidat: KANDIDAT }), /OpenRouter 402/);
  } finally { f.pulihkan(); }
});

test('OpenRouter: balasan terpotong (finish_reason length) ditolak', async () => {
  const f = pasangFetch([{ badan: { model: 'm', choices: [{ finish_reason: 'length', message: { content: '{"layak": tr' } }] } }]);
  try {
    await assert.rejects(buatPenulisAsli('k').tulis({ kandidat: KANDIDAT }), /terpotong/);
  } finally { f.pulihkan(); }
});

test('OpenAI gpt-image-2.6-flare: permintaan sesuai, PNG base64 jadi WebP 1280x720', async () => {
  delete process.env.OPENAI_IMAGE_MODEL;
  const sharp = (await import('sharp')).default;
  const png = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: { r: 30, g: 60, b: 120 } } }).png().toBuffer();
  const f = pasangFetch([{ badan: { data: [{ b64_json: png.toString('base64') }], usage: { output_tokens: 400, input_tokens: 80 } } }]);
  try {
    const g = buatPembuatGambar({ kunciOpenAI: 'kunci-uji', riwayat: {}, maks: 2 });
    const h = await g.buat({ slug: 'uji', kanal: 'bisnis', frasa: 'a woman holding cash' });
    const req = f.panggilan[0];
    assert.equal(req.url, 'https://api.openai.com/v1/images/generations');
    assert.deepEqual({ model: req.badan.model, size: req.badan.size, quality: req.badan.quality, n: req.badan.n }, { model: 'gpt-image-2.6-flare', size: '1536x1024', quality: 'low', n: 1 });
    assert.ok(req.badan.prompt.includes('no faces, no people'));
    assert.ok(!/woman|cash/.test(req.badan.prompt), 'objek berorang/beruang diganti cadangan');
    assert.equal(h.frasaDiganti, true);
    assert.equal(h.sumber, 'openai:gpt-image-2.6-flare');
    const meta = await sharp(h.webp).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ['webp', 1280, 720]);
  } finally { f.pulihkan(); }
});

test('OpenAI: model yang sudah tidak ada (400) dilewati, model berikutnya dipakai', async () => {
  delete process.env.OPENAI_IMAGE_MODEL;
  const sharp = (await import('sharp')).default;
  const png = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();
  const f = pasangFetch([
    { status: 400, badan: { error: { message: "The model 'gpt-image-2.6-flare' does not exist.", type: 'image_generation_user_error', param: 'model' } } },
    { badan: { data: [{ b64_json: png.toString('base64') }] } },
  ]);
  try {
    const g = buatPembuatGambar({ kunciOpenAI: 'kunci-uji', riwayat: {}, maks: 3 });
    const h = await g.buat({ slug: 'uji-model', kanal: 'bisnis', frasa: 'a tidy shop counter with woven baskets' });
    assert.equal(f.panggilan[1].badan.model, 'gpt-image-2.5-flare');
    assert.equal(h.sumber, 'openai:gpt-image-2.5-flare');
  } finally { f.pulihkan(); }
});

test('Pollinations mati bawaan: OpenAI gagal (401) = gambar gagal, tanpa memanggil Pollinations', async () => {
  const f = pasangFetch([{ status: 401, badan: { error: { message: 'bad key' } } }]);
  try {
    const g = buatPembuatGambar({ kunciOpenAI: 'salah', riwayat: {}, maks: 3 });
    await assert.rejects(g.buat({ slug: 'uji3', kanal: 'bisnis', frasa: 'a tidy shop counter with woven baskets' }), /gambar gagal/);
    assert.equal(f.panggilan.length, 1, 'kunci salah mematikan semua model OpenAI sekaligus; Pollinations tidak dipanggil');
    await assert.rejects(g.buat({ slug: 'uji4', kanal: 'bisnis', frasa: 'a tidy shop counter' }), /tidak ada penyedia gambar/);
  } finally { f.pulihkan(); }
});

test('OpenAI gagal (401) jatuh ke Pollinations bila dinyalakan, dan OpenAI dimatikan untuk sisa putaran', async () => {
  const sharp = (await import('sharp')).default;
  // Derau supaya JPEG-nya wajar besar (Pollinations di atas 20 KB dianggap gambar sungguhan).
  const jpg = await sharp({ create: { width: 1536, height: 1024, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 40 } } }).jpeg({ quality: 90 }).toBuffer();
  assert.ok(jpg.length > 20000);
  const f = pasangFetch([
    { status: 401, badan: { error: { message: 'bad key' } } },
    { badan: jpg, tipe: 'image/jpeg' },
  ]);
  try {
    const g = buatPembuatGambar({ kunciOpenAI: 'salah', pollinations: true, riwayat: {}, maks: 3 });
    const h = await g.buat({ slug: 'uji2', kanal: 'bisnis', frasa: 'a tidy shop counter with woven baskets' });
    assert.equal(h.sumber, 'pollinations:flux');
    assert.ok(f.panggilan[1].url.startsWith('https://image.pollinations.ai/prompt/'));
  } finally { f.pulihkan(); }
});

test('Telegram: kabar terbit, push gagal, dan putaran kosong', () => {
  const r = { terbit: [{ jenis: 'berita', judul: 'Judul A', slug: 'judul-a', kanal: 'keuangan', sumber: 'DJP' }], galat: [], terbitHariIni: { berita: 4, tips: 1 }, waktuTeks: '16 November 2026 09.13 WIB', biayaUsd: 0.003, gambar: 1 };
  const ok = susunPesan(r, { hasilPush: 'berhasil', hasilJob: 'success', origin: 'https://contoh.id' });
  assert.ok(ok.includes('1 berita + 0 tips terbit') && ok.includes('href="https://contoh.id/berita/judul-a"'));
  const gagal = susunPesan(r, { hasilPush: 'gagal', hasilJob: 'failure', origin: 'https://contoh.id' });
  assert.ok(gagal.includes('TIDAK tayang'));
  const gerbang = susunPesan(r, { hasilPush: '', hasilJob: 'failure', origin: 'https://contoh.id' });
  assert.ok(gerbang.includes('TIDAK tayang'));
  assert.equal(susunPesan({ terbit: [], galat: [] }, { hasilJob: 'success' }), '');
});
