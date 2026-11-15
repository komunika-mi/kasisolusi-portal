// Sampul ilustrasi AI. Keputusan pemilik: OpenAI gpt-image-1 kualitas low, cadangan Pollinations
// (gratis, tanpa kunci). Hasil dipotong ke 1280x720 WebP, sasaran di bawah sekitar 150 KB.
//
// Panggilan OpenAI meniru yang sudah jalan di seremonia-autopost/src/image.js:
// POST /v1/images/generations {model, prompt, size: 1536x1024, quality: low, n: 1} -> data[0].b64_json.
// Pollinations meniru asphirasi-daily/publish.py: GET image.pollinations.ai/prompt/<prompt>?...
//
// Pagar prompt: subjek hanya benda atau suasana, ditambah "no text, no lettering, no numbers,
// no logos, no faces, no people". Pelajaran dari proyek lain: model mengabaikan larangan tulisan
// kalau subjeknya memang bertulisan (dokumen, papan nama, uang), jadi subjek seperti itu disaring
// lebih dulu di penjaga.amankanIlustrasi.
import { sha256, log } from './alat.mjs';
import { amankanIlustrasi } from './penjaga.mjs';

const PAGAR = 'No text, no lettering, no numbers, no logos, no faces, no people, no watermark.';
const VARIASI = ['', ' Seen from a slightly higher angle.', ' Wider framing with more empty space.', ' Objects arranged diagonally, cooler afternoon light.'];

export function promptGambar(frasa, varian = 0) {
  return `Editorial illustration for an Indonesian small-business news site: ${frasa}. Modern flat illustration with soft gradients and subtle paper grain, deep navy and bright blue palette with a warm orange accent, clean composition, generous negative space, wide 3:2 framing.${VARIASI[varian % VARIASI.length]} ${PAGAR}`;
}

async function dariOpenAI(prompt, kunci) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kunci}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'low', n: 1 }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).replace(/\s+/g, ' ').slice(0, 140)}`);
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI: balasan tanpa gambar');
  return Buffer.from(b64, 'base64');
}

async function dariPollinations(prompt) {
  const seed = 1 + Math.floor(Math.random() * 1e6);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1536&height=1024&model=flux&nologo=true&private=true&safe=true&seed=${seed}`;
  let r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  // Jalur tanpa kunci dibatasi laju; permintaan beruntun dari laptop 15 Nov 2026 sempat ditolak.
  // Satu kali tunggu lalu ulang, tidak lebih.
  if (r.status === 429 || r.status >= 500) {
    await r.body?.cancel().catch(() => {});
    await new Promise((ok) => setTimeout(ok, 15000));
    r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  }
  if (!r.ok) throw new Error(`Pollinations ${r.status}`);
  const tipe = r.headers.get('content-type') || '';
  const buf = Buffer.from(await r.arrayBuffer());
  if (!tipe.startsWith('image/') || buf.length < 20000) throw new Error(`Pollinations: bukan gambar (${tipe}, ${buf.length} B)`);
  return buf;
}

/** Gambar pengganti untuk uji kering tanpa kunci: gradasi polos (tanpa teks), warnanya dari slug. */
async function dariTiruan(slug) {
  const sharp = (await import('sharp')).default;
  const h = parseInt(sha256(slug).slice(0, 6), 16);
  const w1 = `hsl(${h % 360}, 55%, 22%)`;
  const w2 = `hsl(${(h >> 8) % 360}, 70%, 55%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${w1}"/><stop offset="1" stop-color="${w2}"/></linearGradient></defs><rect width="1536" height="1024" fill="url(#g)"/><circle cx="${400 + (h % 700)}" cy="512" r="260" fill="rgba(255,255,255,0.12)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Potong ke 1280x720 dan simpan sebagai WebP, turunkan mutu sampai di bawah ~150 KB. */
export async function jadikanSampul(buf) {
  const sharp = (await import('sharp')).default;
  const dasar = sharp(buf).rotate().resize(1280, 720, { fit: 'cover', position: sharp.strategy.attention });
  let hasil = null;
  for (const q of [78, 70, 62, 55]) {
    hasil = await dasar.clone().webp({ quality: q, effort: 5 }).toBuffer();
    if (hasil.length <= 150 * 1024) break;
  }
  const meta = await sharp(hasil).metadata();
  if (meta.width !== 1280 || meta.height !== 720) throw new Error(`ukuran sampul salah ${meta.width}x${meta.height}`);
  return hasil;
}

/**
 * Pembuat gambar untuk satu putaran.
 * @param {{kunciOpenAI?:string, tiruan?:boolean, riwayat:Record<string,object>, maks:number}} o
 */
export function buatPembuatGambar({ kunciOpenAI = '', tiruan = false, riwayat = {}, maks = 6 }) {
  // `dipakai` menghitung gambar yang benar-benar dihasilkan (termasuk yang ternyata kembar),
  // karena itulah yang berbiaya. Percobaan gagal dibatasi terpisah supaya tidak berputar-putar.
  let dipakai = 0;
  let percobaan = 0;
  const gagalPenyedia = {};
  const sidikPutaran = new Set();
  const penyedia = tiruan
    ? [['tiruan', (p, slug) => dariTiruan(slug)]]
    : [
      ...(kunciOpenAI ? [['openai:gpt-image-1', (p) => dariOpenAI(p, kunciOpenAI)]] : []),
      ['pollinations:flux', (p) => dariPollinations(p)],
    ];
  return {
    get dipakai() { return dipakai; },
    /** @returns {Promise<{webp:Buffer, sumber:string, sidik:string, frasa:string, frasaDiganti:boolean}>} */
    async buat({ slug, kanal, frasa }) {
      const aman = amankanIlustrasi(frasa, kanal);
      const galat = [];
      for (let varian = 0; varian < 3; varian++) {
        const prompt = promptGambar(aman.frasa, varian);
        for (const p of [...penyedia]) {
          const [nama, fn] = p;
          if (dipakai >= maks) throw new Error(`batas ${maks} gambar per putaran tercapai`);
          if (++percobaan > maks * 3) throw new Error('terlalu banyak percobaan gambar gagal di putaran ini');
          try {
            const mentah = await fn(prompt, `${slug}-${varian}`);
            dipakai++;
            const sidik = sha256(mentah);
            if (riwayat[sidik] || sidikPutaran.has(sidik)) {
              galat.push(`${nama}: gambar kembar dengan sampul lama`);
              continue;
            }
            const webp = await jadikanSampul(mentah);
            sidikPutaran.add(sidik);
            return { webp, sumber: nama, sidik, frasa: aman.frasa, frasaDiganti: aman.diganti };
          } catch (e) {
            galat.push(`${nama}: ${e.message}`);
            log(`  gambar ${nama} gagal: ${e.message}`);
            // Kunci salah atau saldo habis tidak akan pulih di putaran yang sama, dan penyedia yang
            // gagal dua kali (misalnya timeout) hanya memakan waktu: matikan untuk sisa putaran.
            gagalPenyedia[nama] = (gagalPenyedia[nama] || 0) + 1;
            if ((/\b(401|403)\b|insufficient_quota|billing/i.test(e.message) || gagalPenyedia[nama] >= 2) && penyedia.length > 1) {
              penyedia.splice(penyedia.indexOf(p), 1);
              log(`  gambar: ${nama} dimatikan untuk sisa putaran ini`);
            }
          }
        }
        if (!galat.some((g) => g.includes('kembar'))) break; // ulang varian hanya kalau kembar
      }
      throw new Error(`gambar gagal: ${galat.slice(-3).join(' | ')}`);
    },
  };
}
