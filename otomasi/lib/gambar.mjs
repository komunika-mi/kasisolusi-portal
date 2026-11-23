// Sampul ilustrasi AI. Keputusan pemilik: OpenAI kualitas low, cadangan Pollinations. Hasil dipotong
// ke 1280x720 WebP, sasaran di bawah sekitar 150 KB.
//
// OpenAI: POST /v1/images/generations {model, prompt, size: 1536x1024, quality: low, n: 1}
// -> data[0].b64_json. Model dari konfigurasi.daftarModelGambar() (gpt-image-1 sudah dimatikan
// OpenAI 23 Okt 2026).
//
// Pollinations (GET image.pollinations.ai/prompt/<prompt>?...) MATI bawaan sejak uji kering
// 15 Nov 2026: jalur tanpa kunci menempelkan watermark "pollinations.ai" di pojok kanan bawah walau
// diminta nologo=true, dan menjawab 402 sesudah tiga gambar. Gambar bertanda air tidak boleh
// terbit. Nyalakan hanya dengan sadar (variabel GAMBAR_POLLINATIONS=ya, atau --pollinations di
// uji kering). Tanpa penyedia yang berhasil, artikel dilewati dan dicoba lagi di putaran berikutnya.
//
// Pagar prompt: subjek hanya benda atau suasana, ditambah "no text, no lettering, no numbers,
// no logos, no faces, no people". Pelajaran dari proyek lain: model mengabaikan larangan tulisan
// kalau subjeknya memang bertulisan (dokumen, papan nama, uang), jadi subjek seperti itu disaring
// lebih dulu di penjaga.amankanIlustrasi.
//
// Cap logo (permintaan tim Kasisolusi 23 Nov 2026; pengguna memilih pojok KIRI ATAS dan HANYA
// ilustrasi AI): logo putih situs (public/assets/logo-white.png) selebar 210 px di atas kapsul navy
// 80%, 32 px dari tepi kiri dan atas kanvas 1280x720. Foto rilis lembaga tidak dicap karena fotonya
// milik lembaga dan sudah berkredit "Dok. ...". Logo ditempel sesudah gambar jadi, bukan diminta ke
// model (model tidak bisa menggambar logo dengan tepat). Sampul yang dicap membawa penanda EXIF
// ImageDescription, supaya otomasi/cap-logo-sampul.mjs tidak pernah mengecap dua kali.
import { fileURLToPath } from 'node:url';
import { sha256, log } from './alat.mjs';
import { amankanIlustrasi } from './penjaga.mjs';
import { daftarModelGambar } from './konfigurasi.mjs';

const PAGAR = 'No text, no lettering, no numbers, no logos, no faces, no people, no watermark.';
const VARIASI = ['', ' Seen from a slightly higher angle.', ' Wider framing with more empty space.', ' Objects arranged diagonally, cooler afternoon light.'];

export function promptGambar(frasa, varian = 0) {
  return `Editorial illustration for an Indonesian small-business news site: ${frasa}. Modern flat illustration with soft gradients and subtle paper grain, deep navy and bright blue palette with a warm orange accent, clean composition, generous negative space, wide 3:2 framing.${VARIASI[varian % VARIASI.length]} ${PAGAR}`;
}

async function dariOpenAI(prompt, kunci, model) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kunci}` },
    body: JSON.stringify({ model, prompt, size: '1536x1024', quality: 'low', n: 1 }),
    signal: AbortSignal.timeout(150000),
  });
  if (!r.ok) {
    const teks = (await r.text()).replace(/\s+/g, ' ').slice(0, 220);
    const e = new Error(`OpenAI ${r.status}: ${teks}`);
    // Model yang tidak ada (dimatikan, salah ketik) atau belum boleh dipakai organisasi ini
    // tidak akan pulih di putaran yang sama: penyedianya dimatikan, model berikutnya dicoba.
    e.permanen = r.status === 404 || (r.status === 400 && /does not exist|not found|unknown model|must be verified|verify your organization/i.test(teks));
    throw e;
  }
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI: balasan tanpa gambar');
  // Token keluaran dicatat supaya biaya nyata per gambar bisa dihitung dari log Actions.
  if (j.usage) log(`  gambar ${model}: ${j.usage.output_tokens ?? '?'} token keluaran, ${j.usage.input_tokens ?? '?'} token masukan`);
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

const LOGO = fileURLToPath(new URL('../../public/assets/logo-white.png', import.meta.url));
export const CAP_LOGO = Object.freeze({ lebar: 210, padX: 18, padY: 12, tepi: 32, warna: '#0a1530', opasitas: 0.8, penanda: 'Logo Kasisolusi' });

let lencana = null;
/** Kapsul navy berisi logo putih (PNG), dibuat sekali per proses. */
async function buatLencana() {
  if (lencana) return lencana;
  const sharp = (await import('sharp')).default;
  const logo = await sharp(LOGO).resize({ width: CAP_LOGO.lebar }).png().toBuffer();
  const { height } = await sharp(logo).metadata();
  const w = CAP_LOGO.lebar + 2 * CAP_LOGO.padX;
  const h = height + 2 * CAP_LOGO.padY;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${h / 2}" fill="${CAP_LOGO.warna}" fill-opacity="${CAP_LOGO.opasitas}"/></svg>`;
  lencana = await sharp(Buffer.from(svg)).composite([{ input: logo, left: CAP_LOGO.padX, top: CAP_LOGO.padY }]).png().toBuffer();
  return lencana;
}

/** Tambahkan cap logo dan penandanya ke pipa sharp berukuran 1280x720. */
async function pasangLogo(pipa) {
  return pipa
    .composite([{ input: await buatLencana(), left: CAP_LOGO.tepi, top: CAP_LOGO.tepi }])
    .withExif({ IFD0: { ImageDescription: CAP_LOGO.penanda } });
}

/** Simpan pipa 1280x720 sebagai WebP, turunkan mutu sampai di bawah ~150 KB. */
async function simpanSampul(pipa) {
  const sharp = (await import('sharp')).default;
  let hasil = null;
  for (const q of [78, 70, 62, 55]) {
    hasil = await pipa.clone().webp({ quality: q, effort: 5 }).toBuffer();
    if (hasil.length <= 150 * 1024) break;
  }
  const meta = await sharp(hasil).metadata();
  if (meta.width !== 1280 || meta.height !== 720) throw new Error(`ukuran sampul salah ${meta.width}x${meta.height}`);
  return hasil;
}

/**
 * Potong ke 1280x720 dan simpan sebagai WebP, turunkan mutu sampai di bawah ~150 KB.
 * `logo: true` hanya untuk ilustrasi AI (lihat cap logo di atas); foto rilis memanggil tanpa opsi.
 */
export async function jadikanSampul(buf, { logo = false } = {}) {
  const sharp = (await import('sharp')).default;
  const dasar = sharp(buf).rotate().resize(1280, 720, { fit: 'cover', position: sharp.strategy.attention });
  if (logo) await pasangLogo(dasar);
  return simpanSampul(dasar);
}

/** Cap logo ke sampul 1280x720 yang sudah terbit (dipakai otomasi/cap-logo-sampul.mjs). */
export async function capLogoSampul(buf) {
  const sharp = (await import('sharp')).default;
  const meta = await sharp(buf).metadata();
  if (meta.width !== 1280 || meta.height !== 720) throw new Error(`sampul bukan 1280x720 (${meta.width}x${meta.height})`);
  return simpanSampul(await pasangLogo(sharp(buf)));
}

/** Sudahkah sampul ini dicap logo? Dibaca dari penanda EXIF yang ditulis pasangLogo. */
export async function sudahBerlogo(buf) {
  const sharp = (await import('sharp')).default;
  const { exif } = await sharp(buf).metadata();
  return Boolean(exif?.includes(CAP_LOGO.penanda));
}

/**
 * Pembuat gambar untuk satu putaran.
 * @param {{kunciOpenAI?:string, tiruan?:boolean, pollinations?:boolean, riwayat:Record<string,object>, maks:number}} o
 */
export function buatPembuatGambar({ kunciOpenAI = '', tiruan = false, pollinations = false, riwayat = {}, maks = 6 }) {
  // `dipakai` menghitung gambar yang benar-benar dihasilkan (termasuk yang ternyata kembar),
  // karena itulah yang berbiaya. Percobaan gagal dibatasi terpisah supaya tidak berputar-putar.
  let dipakai = 0;
  let percobaan = 0;
  const gagalPenyedia = {};
  const sidikPutaran = new Set();
  const penyedia = tiruan
    ? [['tiruan', (p, slug) => dariTiruan(slug)]]
    : [
      ...(kunciOpenAI ? daftarModelGambar().map((m) => [`openai:${m}`, (p) => dariOpenAI(p, kunciOpenAI, m)]) : []),
      ...(pollinations ? [['pollinations:flux', (p) => dariPollinations(p)]] : []),
    ];
  const matikan = (nama) => {
    const i = penyedia.findIndex(([n]) => n === nama);
    if (i < 0) return;
    penyedia.splice(i, 1);
    log(`  gambar: ${nama} dimatikan untuk sisa putaran ini`);
  };
  return {
    get dipakai() { return dipakai; },
    /** @returns {Promise<{webp:Buffer, sumber:string, sidik:string, frasa:string, frasaDiganti:boolean}>} */
    async buat({ slug, kanal, frasa }) {
      if (!penyedia.length) throw new Error('tidak ada penyedia gambar yang aktif di putaran ini');
      const aman = amankanIlustrasi(frasa, kanal);
      const galat = [];
      for (let varian = 0; varian < 3; varian++) {
        const prompt = promptGambar(aman.frasa, varian);
        for (const p of [...penyedia]) {
          if (!penyedia.includes(p)) continue; // dimatikan oleh galat penyedia sebelumnya di putaran ini
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
            const webp = await jadikanSampul(mentah, { logo: true });
            sidikPutaran.add(sidik);
            return { webp, sumber: nama, sidik, frasa: aman.frasa, frasaDiganti: aman.diganti };
          } catch (e) {
            galat.push(`${nama}: ${e.message}`);
            log(`  gambar ${nama} gagal: ${e.message}`);
            // Kunci salah atau saldo habis tidak akan pulih di putaran yang sama (untuk OpenAI itu
            // berlaku ke semua modelnya, karena kuncinya sama), begitu juga model yang tidak ada.
            // Penyedia yang gagal dua kali karena hal lain (misalnya timeout) hanya memakan waktu:
            // dimatikan kalau masih ada penyedia lain.
            gagalPenyedia[nama] = (gagalPenyedia[nama] || 0) + 1;
            if (/\b(401|402|403)\b|insufficient_quota|billing/i.test(e.message)) {
              const kelompok = nama.split(':')[0];
              for (const [n] of [...penyedia]) if (n.split(':')[0] === kelompok) matikan(n);
            } else if (e.permanen || (gagalPenyedia[nama] >= 2 && penyedia.length > 1)) {
              matikan(nama);
            }
          }
        }
        if (!galat.some((g) => g.includes('kembar'))) break; // ulang varian hanya kalau kembar
      }
      throw new Error(`gambar gagal: ${galat.slice(-3).join(' | ')}`);
    },
  };
}
